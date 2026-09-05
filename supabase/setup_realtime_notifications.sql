-- ============================================================
-- CARWISE — Notificações em Tempo Real + E-mail
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- 1. Tabela de notificações do CLIENTE
CREATE TABLE IF NOT EXISTS notificacoes_cliente (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT DEFAULT 'info' CHECK (tipo IN ('proposta', 'mensagem', 'agendamento', 'status', 'contrato', 'pagamento', 'info', 'sistema')),
  titulo TEXT NOT NULL,
  mensagem TEXT,
  lida BOOLEAN DEFAULT false,
  link TEXT,
  importancia TEXT DEFAULT 'normal' CHECK (importancia IN ('baixa', 'normal', 'alta')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Adicionar coluna importancia na tabela de notificações do consultor (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notificacoes_consultor' AND column_name = 'importancia'
  ) THEN
    ALTER TABLE notificacoes_consultor ADD COLUMN importancia TEXT DEFAULT 'normal'
      CHECK (importancia IN ('baixa', 'normal', 'alta'));
  END IF;
END $$;

-- 3. Log de e-mails enviados (anti-spam)
CREATE TABLE IF NOT EXISTS email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  destinatario_email TEXT NOT NULL,
  tipo TEXT NOT NULL,
  titulo TEXT,
  enviado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_destinatario ON email_log(destinatario_email, tipo, enviado_em);

-- 4. Preferências de notificação
CREATE TABLE IF NOT EXISTS preferencias_notificacao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID NOT NULL UNIQUE,
  -- Consultor preferences
  email_nova_mensagem BOOLEAN DEFAULT true,
  email_proposta_aceita BOOLEAN DEFAULT true,
  email_proposta_recusada BOOLEAN DEFAULT true,
  email_novo_agendamento BOOLEAN DEFAULT true,
  email_comissao BOOLEAN DEFAULT true,
  email_novo_cliente BOOLEAN DEFAULT true,
  -- Cliente preferences
  email_nova_proposta BOOLEAN DEFAULT true,
  email_msg_consultor BOOLEAN DEFAULT true,
  email_atualizacao_status BOOLEAN DEFAULT true,
  email_agendamento_confirmado BOOLEAN DEFAULT true,
  -- Global
  emails_habilitados BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_cliente_id ON notificacoes_cliente(cliente_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_cliente_lida ON notificacoes_cliente(lida);
CREATE INDEX IF NOT EXISTS idx_preferencias_auth_id ON preferencias_notificacao(auth_id);

-- 6. RLS
ALTER TABLE notificacoes_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferencias_notificacao ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Clientes veem suas notificacoes" ON notificacoes_cliente;
DROP POLICY IF EXISTS "Clientes inserem notificacoes" ON notificacoes_cliente;
DROP POLICY IF EXISTS "Service role email_log" ON email_log;
DROP POLICY IF EXISTS "Usuarios veem suas preferencias" ON preferencias_notificacao;
DROP POLICY IF EXISTS "Usuarios editam suas preferencias" ON preferencias_notificacao;
DROP POLICY IF EXISTS "Usuarios inserem preferencias" ON preferencias_notificacao;

-- Clientes podem ver e atualizar suas notificações
CREATE POLICY "Clientes veem suas notificacoes" ON notificacoes_cliente
  FOR ALL USING (
    cliente_id IN (SELECT id FROM clientes WHERE auth_id = auth.uid())
  );

-- Permitir INSERT via service role (para o consultor criar notificação para o cliente)
-- E também permitir que consultores criem notificações para seus clientes
CREATE POLICY "Clientes inserem notificacoes" ON notificacoes_cliente
  FOR INSERT WITH CHECK (
    cliente_id IN (SELECT id FROM clientes WHERE auth_id = auth.uid())
    OR
    cliente_id IN (
      SELECT id FROM clientes WHERE consultor_id IN (
        SELECT id FROM consultores WHERE auth_id = auth.uid()
      )
    )
  );

-- Email log: acesso total via service role (API routes), leitura para o próprio usuário
CREATE POLICY "Service role email_log" ON email_log
  FOR ALL USING (true);

-- Preferências: cada usuário vê/edita suas próprias
CREATE POLICY "Usuarios veem suas preferencias" ON preferencias_notificacao
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "Usuarios editam suas preferencias" ON preferencias_notificacao
  FOR UPDATE USING (auth_id = auth.uid());

CREATE POLICY "Usuarios inserem preferencias" ON preferencias_notificacao
  FOR INSERT WITH CHECK (auth_id = auth.uid());

-- 7. Habilitar Realtime para as tabelas de notificação
-- IMPORTANTE: Isso adiciona as tabelas à publicação do Supabase Realtime
DO $$
BEGIN
  -- notificacoes_consultor
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notificacoes_consultor'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes_consultor;
  END IF;

  -- notificacoes_cliente
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notificacoes_cliente'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes_cliente;
  END IF;

  -- mensagens_chat (caso ainda não esteja)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'mensagens_chat'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mensagens_chat;
  END IF;
END $$;
