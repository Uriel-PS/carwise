-- Tabela para armazenar as fotos dos veículos (URLs do R2)
CREATE TABLE IF NOT EXISTS veiculo_fotos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  ordem INTEGER NOT NULL CHECK (ordem >= 0 AND ordem <= 3),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(veiculo_id, ordem)
);

-- Índice para performance ao buscar fotos de um veículo
CREATE INDEX IF NOT EXISTS idx_veiculo_fotos_veiculo_id ON veiculo_fotos(veiculo_id);

-- Habilitar RLS
ALTER TABLE veiculo_fotos ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
-- 1. Qualquer pessoa autenticada pode ler as fotos (clientes, consultores, concessionárias)
CREATE POLICY "Leitura pública de fotos autenticada"
  ON veiculo_fotos FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Concessionária pode inserir/atualizar/deletar fotos de seus próprios veículos
CREATE POLICY "Concessionaria gerencia fotos dos seus veiculos"
  ON veiculo_fotos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM veiculos v 
      JOIN concessionarias c ON v.concessionaria_id = c.id
      WHERE v.id = veiculo_fotos.veiculo_id 
      AND c.auth_id = auth.uid()
    )
  );
