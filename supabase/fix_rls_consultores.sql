-- Garante que qualquer consultor logado (ou admin) possa ler os nomes dos outros consultores
-- Isso resolve o problema de aparecer '-' nos clientes assumidos por outros consultores

ALTER TABLE consultores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de consultores para todos" ON consultores;

CREATE POLICY "Leitura de consultores para todos" ON consultores
  FOR SELECT
  USING (true);
