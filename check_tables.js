const { createClient } = require('@supabase/supabase-js');
process.loadEnvFile('.env.local');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: cols, error } = await supabase.rpc('get_columns', { table_name: 'documentos_clientes' });
  if (error) {
     const { data } = await supabase.from('documentos_clientes').select('*').limit(1);
     console.log(data);
  } else {
     console.log(cols);
  }
}
check();
