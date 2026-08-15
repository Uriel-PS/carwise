-- ============================================================
-- CARWISE — Tabelas para o Centro de Operações do Consultor
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- 1. Tarefas do Consultor
CREATE TABLE IF NOT EXISTS tarefas_consultor (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultor_id UUID REFERENCES consultores(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  prazo TIMESTAMPTZ,
  concluida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Comissões (1% do valor do veículo vendido)
CREATE TABLE IF NOT EXISTS comissoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultor_id UUID REFERENCES consultores(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  proposta_id UUID REFERENCES propostas(id) ON DELETE SET NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  percentual NUMERIC(5,2) DEFAULT 1.00,
  valor_venda NUMERIC(12,2),
  status TEXT DEFAULT 'prevista' CHECK (status IN ('prevista', 'pendente', 'aprovada', 'paga', 'cancelada')),
  observacao TEXT,
  data_pagamento TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Metas do Consultor
CREATE TABLE IF NOT EXISTS metas_consultor (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultor_id UUID REFERENCES consultores(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL,
  valor_meta NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(consultor_id, mes, ano)
);

-- 4. Notificações do Consultor
CREATE TABLE IF NOT EXISTS notificacoes_consultor (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultor_id UUID REFERENCES consultores(id) ON DELETE CASCADE,
  tipo TEXT DEFAULT 'info' CHECK (tipo IN ('novo_cliente', 'test_drive', 'concessionaria', 'prazo', 'comissao', 'info', 'sistema')),
  titulo TEXT NOT NULL,
  mensagem TEXT,
  lida BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Próxima ação por cliente (campo no próprio cliente ou tabela separada)
-- Adicionamos campos na tabela clientes se ainda não existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'proxima_acao') THEN
    ALTER TABLE clientes ADD COLUMN proxima_acao TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'proxima_acao_prazo') THEN
    ALTER TABLE clientes ADD COLUMN proxima_acao_prazo TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'etapa_pipeline') THEN
    ALTER TABLE clientes ADD COLUMN etapa_pipeline TEXT DEFAULT 'novos';
  END IF;
END $$;

-- 6. Economia gerada (preço anunciado vs negociado)
CREATE TABLE IF NOT EXISTS economia_gerada (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultor_id UUID REFERENCES consultores(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  proposta_id UUID REFERENCES propostas(id) ON DELETE SET NULL,
  preco_anunciado NUMERIC(12,2) NOT NULL,
  preco_negociado NUMERIC(12,2) NOT NULL,
  economia NUMERIC(12,2) GENERATED ALWAYS AS (preco_anunciado - preco_negociado) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tarefas_consultor_id ON tarefas_consultor(consultor_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas_consultor(status);
CREATE INDEX IF NOT EXISTS idx_comissoes_consultor_id ON comissoes(consultor_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON comissoes(status);
CREATE INDEX IF NOT EXISTS idx_metas_consultor_id ON metas_consultor(consultor_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_consultor_id ON notificacoes_consultor(consultor_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes_consultor(lida);
CREATE INDEX IF NOT EXISTS idx_economia_consultor_id ON economia_gerada(consultor_id);

-- RLS (Row Level Security) — habilitar nas tabelas
ALTER TABLE tarefas_consultor ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_consultor ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_consultor ENABLE ROW LEVEL SECURITY;
ALTER TABLE economia_gerada ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem (para permitir reexecução do script sem erro)
DROP POLICY IF EXISTS "Consultores veem suas tarefas" ON tarefas_consultor;
DROP POLICY IF EXISTS "Consultores veem suas comissoes" ON comissoes;
DROP POLICY IF EXISTS "Consultores veem suas metas" ON metas_consultor;
DROP POLICY IF EXISTS "Consultores veem suas notificacoes" ON notificacoes_consultor;
DROP POLICY IF EXISTS "Consultores veem economia" ON economia_gerada;

-- Políticas seguras verificando o auth.uid()
CREATE POLICY "Consultores veem suas tarefas" ON tarefas_consultor
  FOR ALL USING (
    consultor_id IN (SELECT id FROM consultores WHERE auth_id = auth.uid())
  );

CREATE POLICY "Consultores veem suas comissoes" ON comissoes
  FOR ALL USING (
    consultor_id IN (SELECT id FROM consultores WHERE auth_id = auth.uid())
  );

CREATE POLICY "Consultores veem suas metas" ON metas_consultor
  FOR ALL USING (
    consultor_id IN (SELECT id FROM consultores WHERE auth_id = auth.uid())
  );

CREATE POLICY "Consultores veem suas notificacoes" ON notificacoes_consultor
  FOR ALL USING (
    consultor_id IN (SELECT id FROM consultores WHERE auth_id = auth.uid())
  );

CREATE POLICY "Consultores veem economia" ON economia_gerada
  FOR ALL USING (
    consultor_id IN (SELECT id FROM consultores WHERE auth_id = auth.uid())
  );

-- Corrigindo as políticas da tabela 'laudos' apontadas pelo linter do Supabase
DROP POLICY IF EXISTS "Consultores podem inserir laudos na tabela" ON laudos;
DROP POLICY IF EXISTS "Consultores podem deletar laudos da tabela" ON laudos;

CREATE POLICY "Consultores podem inserir laudos na tabela" ON laudos
  FOR INSERT WITH CHECK (
    cliente_id IN (
      SELECT id FROM clientes WHERE consultor_id IN (
        SELECT id FROM consultores WHERE auth_id = auth.uid()
      )
    )
  );

CREATE POLICY "Consultores podem deletar laudos da tabela" ON laudos
  FOR DELETE USING (
    cliente_id IN (
      SELECT id FROM clientes WHERE consultor_id IN (
        SELECT id FROM consultores WHERE auth_id = auth.uid()
      )
    )
  );
