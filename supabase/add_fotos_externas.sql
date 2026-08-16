-- Adiciona a coluna fotos_externas na tabela propostas
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS fotos_externas JSONB DEFAULT '[]'::jsonb;
