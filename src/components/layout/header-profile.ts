import type { User } from '@supabase/supabase-js';
export function getUserInitials(user: Pick<User, 'email'|'user_metadata'>) { const name=user.user_metadata?.full_name??user.user_metadata?.name; if(typeof name==='string'&&name.trim())return name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase(); return user.email?.slice(0,1).toUpperCase()??null; }
export function getUserAvatar(user: Pick<User, 'user_metadata'>) { const value=user.user_metadata?.avatar_url??user.user_metadata?.picture; return typeof value==='string'&&/^https:\/\//.test(value)?value:null; }
