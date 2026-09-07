import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const serviceRole = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim() || key;

const admin = createClient(url, serviceRole);

async function check() {
  console.log("Checking clientes...");
  const { data: clientes } = await admin.from('clientes').select('id, nome, email, auth_id').eq('email', 'b20210311@gmail.com');
  console.log("Clientes:", clientes);

  console.log("Checking email_log...");
  const { data: logs } = await admin.from('email_log').select('*').order('enviado_em', { ascending: false }).limit(5);
  console.log("Logs:", logs);
}
check();
