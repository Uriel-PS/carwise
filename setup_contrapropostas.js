const { createClient } = require('@supabase/supabase-js');
process.loadEnvFile('.env.local');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setup() {
  // Test if table already exists
  const { data, error } = await supabase.from('contrapropostas').select('id').limit(1);
  
  if (error && error.message.includes('does not exist')) {
    console.log('❌ Table contrapropostas does not exist.');
    console.log('');
    console.log('Please run the following SQL in your Supabase Dashboard (SQL Editor):');
    console.log('');
    console.log(`
CREATE TABLE IF NOT EXISTS contrapropostas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposta_id UUID NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
  valor_anterior NUMERIC,
  valor_novo NUMERIC NOT NULL,
  motivo TEXT,
  criado_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contrapropostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo para autenticados" ON contrapropostas
  FOR ALL USING (true) WITH CHECK (true);
    `);
  } else if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('✅ Table contrapropostas already exists!');
  }
}

setup();
