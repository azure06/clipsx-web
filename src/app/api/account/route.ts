import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getVaultPrincipal } from '@/lib/supabase/server';

export type AccountClosureCode = 'UNAUTHORIZED'|'REAUTHENTICATION_REQUIRED'|'CONFIRMATION_REQUIRED'|'ACTIVE_SUBSCRIPTION'|'ORGANIZATION_OWNER'|'CLOSURE_PENDING'|'CLOSURE_FAILED';
export type AccountClosurePreflight = { canClose:boolean; blockers:Array<{code:AccountClosureCode;message:string}> };

async function preflight(accountId:string):Promise<AccountClosurePreflight>{
  const admin=createAdminClient(); const blockers:AccountClosurePreflight['blockers']=[];
  const [{data:organizations},{data:accounts}]=await Promise.all([
    admin.schema('private').from('organizations').select('id').eq('created_by_user_id',accountId).limit(1),
    admin.schema('private').from('billing_accounts').select('id').eq('owner_user_id',accountId),
  ]);
  if(organizations?.length) blockers.push({code:'ORGANIZATION_OWNER',message:'Transfer or delete organizations you own before closing the account.'});
  const billingIds=(accounts??[]).map(row=>row.id);
  if(billingIds.length){const {data}=await admin.schema('private').from('billing_subscriptions').select('stripe_subscription_id,status').in('billing_account_id',billingIds).not('status','in','("canceled","incomplete_expired")');if(data?.length)blockers.push({code:'ACTIVE_SUBSCRIPTION',message:'Active subscriptions must be canceled before account closure.'});}
  return {canClose:blockers.length===0,blockers};
}

export async function GET(){const principal=await getVaultPrincipal();if(!principal)return NextResponse.json({code:'UNAUTHORIZED'},{status:401});return NextResponse.json(await preflight(principal.user.id));}

export async function DELETE(request:Request){
  const principal=await getVaultPrincipal(); if(!principal)return NextResponse.json({code:'UNAUTHORIZED'},{status:401});
  const body=await request.json().catch(()=>null) as {confirmation?:unknown;cancelSubscriptions?:unknown}|null;
  if(body?.confirmation!=='DELETE')return NextResponse.json({code:'CONFIRMATION_REQUIRED'},{status:400});
  const sessionAdmin=createAdminClient();
  const {data:session}=await sessionAdmin.schema('auth').from('sessions').select('created_at').eq('id',principal.sessionId).eq('user_id',principal.user.id).maybeSingle();
  const sessionCreated=session?.created_at?Date.parse(session.created_at):Number.NaN;
  if(!Number.isFinite(sessionCreated)||Date.now()-sessionCreated>600_000)return NextResponse.json({code:'REAUTHENTICATION_REQUIRED'},{status:403});
  const check=await preflight(principal.user.id);
  if(check.blockers.some(blocker=>blocker.code==='ORGANIZATION_OWNER'))return NextResponse.json(check,{status:409});
  if(check.blockers.some(blocker=>blocker.code==='ACTIVE_SUBSCRIPTION')){
    if(body.cancelSubscriptions!==true)return NextResponse.json(check,{status:409});
    const secret=process.env.STRIPE_SECRET_KEY;if(!secret)return NextResponse.json({code:'CLOSURE_FAILED'},{status:503});
    const admin=createAdminClient();const {data:accounts}=await admin.schema('private').from('billing_accounts').select('id').eq('owner_user_id',principal.user.id);const ids=(accounts??[]).map(row=>row.id);
    if(ids.length){const {data:subscriptions}=await admin.schema('private').from('billing_subscriptions').select('stripe_subscription_id,status').in('billing_account_id',ids).not('status','in','("canceled","incomplete_expired")');const stripe=new Stripe(secret,{apiVersion:'2026-06-24.dahlia'});await Promise.all((subscriptions??[]).map(subscription=>stripe.subscriptions.cancel(subscription.stripe_subscription_id)));}
    return NextResponse.json({code:'CLOSURE_PENDING',message:'Subscriptions were canceled. Retry after billing confirmation is received.'},{status:202});
  }
  const admin=createAdminClient();const {data,error}=await admin.schema('private').rpc('close_account',{p_account_id:principal.user.id});
  if(error){const code=error.message.includes('subscription')?'ACTIVE_SUBSCRIPTION':error.message.includes('organization')?'ORGANIZATION_OWNER':'CLOSURE_FAILED';return NextResponse.json({code},{status:code==='CLOSURE_FAILED'?500:409});}
  return NextResponse.json({closed:Boolean(data)});
}
