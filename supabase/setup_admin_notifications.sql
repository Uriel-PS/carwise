-- ============================================================
-- CARWISE — Chat Consultor↔Admin + Notificações do Admin
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- 1. Tabela de mensagens entre consultor e admin
CREATE TABLE IF NOT EXISTS mensagens_consultor_admin (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultor_id UUID REFERENCES consultores(id) ON DELETE CASCADE,
  autor_tipo TEXT NOT NULL CHECK (autor_tipo IN ('consultor', 'admin')),
  autor_id TEXT NOT NULL,
  autor_nome TEXT,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msg_consultor_admin_consultor ON mensagens_consultor_admin(consultor_id);
CREATE INDEX IF NOT EXISTS idx_msg_consultor_admin_lida ON mensagens_consultor_admin(lida);

-- 2. Tabela de notificações do admin
CREATE TABLE IF NOT EXISTS notificacoes_admin (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  tipo TEXT DEFAULT 'info' CHECK (tipo IN ('pagamento', 'comissao', 'mensagem_consultor', 'novo_cliente', 'info', 'sistema')),
  titulo TEXT NOT NULL,
  mensagem TEXT,
  lida BOOLEAN DEFAULT false,
  link TEXT,
  importancia TEXT DEFAULT 'normal' CHECK (importancia IN ('baixa', 'normal', 'alta')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_admin_id ON notificacoes_admin(admin_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_admin_lida ON notificacoes_admin(lida);

-- 3. RLS
ALTER TABLE mensagens_consultor_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_admin ENABLE ROW LEVEL SECURITY;

-- Políticas de mensagens consultor↔admin:
-- Consultores veem suas próprias mensagens
DROP POLICY IF EXISTS "Consultores veem suas mensagens com admin" ON mensagens_consultor_admin;
CREATE POLICY "Consultores veem suas mensagens com admin" ON mensagens_consultor_admin
  FOR SELECT USING (
    consultor_id IN (SELECT id FROM consultores WHERE auth_id = auth.uid())
  );

-- Consultores podem inserir mensagens (só como tipo 'consultor')
DROP POLICY IF EXISTS "Consultores inserem mensagens para admin" ON mensagens_consultor_admin;
CREATE POLICY "Consultores inserem mensagens para admin" ON mensagens_consultor_admin
  FOR INSERT WITH CHECK (
    autor_tipo = 'consultor'
    AND consultor_id IN (SELECT id FROM consultores WHERE auth_id = auth.uid())
  );

-- Consultores podem marcar mensagens como lidas (só as recebidas, tipo 'admin')
DROP POLICY IF EXISTS "Consultores atualizam mensagens do admin" ON mensagens_consultor_admin;
CREATE POLICY "Consultores atualizam mensagens do admin" ON mensagens_consultor_admin
  FOR UPDATE USING (
    autor_tipo = 'admin'
    AND consultor_id IN (SELECT id FROM consultores WHERE auth_id = auth.uid())
  );

-- Admins veem todas as mensagens
DROP POLICY IF EXISTS "Admins veem todas mensagens consultor" ON mensagens_consultor_admin;
CREATE POLICY "Admins veem todas mensagens consultor" ON mensagens_consultor_admin
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admins WHERE auth_id = auth.uid() AND ativo = true)
  );

-- Admins podem inserir mensagens (só como tipo 'admin')
DROP POLICY IF EXISTS "Admins inserem mensagens para consultor" ON mensagens_consultor_admin;
CREATE POLICY "Admins inserem mensagens para consultor" ON mensagens_consultor_admin
  FOR INSERT WITH CHECK (
    autor_tipo = 'admin'
    AND EXISTS (SELECT 1 FROM admins WHERE auth_id = auth.uid() AND ativo = true)
  );

-- Admins podem atualizar mensagens (marcar como lida)
DROP POLICY IF EXISTS "Admins atualizam mensagens de consultor" ON mensagens_consultor_admin;
CREATE POLICY "Admins atualizam mensagens de consultor" ON mensagens_consultor_admin
  FOR UPDATE USING (
    autor_tipo = 'consultor'
    AND EXISTS (SELECT 1 FROM admins WHERE auth_id = auth.uid() AND ativo = true)
  );

-- Notificações do admin: admins veem/atualizam as próprias
DROP POLICY IF EXISTS "Admins veem suas notificacoes" ON notificacoes_admin;
CREATE POLICY "Admins veem suas notificacoes" ON notificacoes_admin
  FOR SELECT USING (
    admin_id IN (SELECT id FROM admins WHERE auth_id = auth.uid() AND ativo = true)
  );

DROP POLICY IF EXISTS "Admins atualizam suas notificacoes" ON notificacoes_admin;
CREATE POLICY "Admins atualizam suas notificacoes" ON notificacoes_admin
  FOR UPDATE USING (
    admin_id IN (SELECT id FROM admins WHERE auth_id = auth.uid() AND ativo = true)
  );

-- Permitir INSERT pelo service_role (backend) — o service_role ignora RLS nativamente

-- 4. Habilitar Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'mensagens_consultor_admin'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mensagens_consultor_admin;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notificacoes_admin'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes_admin;
  END IF;
END $$;
