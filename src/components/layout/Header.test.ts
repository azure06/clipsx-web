import { describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { getUserAvatar, getUserInitials } from './header-profile';
const user=(email:string|null,user_metadata:Record<string,unknown>)=>({email,user_metadata}) as Pick<User,'email'|'user_metadata'>;
describe('account identity fallback',()=>{
  it('uses provider names before email initials',()=>expect(getUserInitials(user('a@example.com',{full_name:'Ada Lovelace'}))).toBe('AL'));
  it('falls back to an email initial',()=>expect(getUserInitials(user('clips@example.com',{}))).toBe('C'));
  it('admits only HTTPS provider avatars',()=>{expect(getUserAvatar(user(null,{avatar_url:'https://example.com/a.png'}))).toBe('https://example.com/a.png');expect(getUserAvatar(user(null,{avatar_url:'javascript:alert(1)'}))).toBeNull()});
});
