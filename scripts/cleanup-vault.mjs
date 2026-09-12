import { createClient } from '@supabase/supabase-js';

for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let total = 0;
for (let batch = 0; batch < 100; batch++) {
  const { data, error } = await db.schema('private').rpc('cleanup_vault_registrations', { p_limit: 1000 });
  if (error) throw new Error(`Vault cleanup failed (${error.code})`);
  total += data;
  if (data === 0) break;
}
console.log(`Removed ${total} expired registration records.`);
