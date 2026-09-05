import { createClient } from '@supabase/supabase-js'

/**
 * Helper para criar notificações e disparar e-mails quando necessário.
 * Estas funções rodam no SERVIDOR (API routes).
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Criar notificação para o consultor
 */
export async function criarNotificacaoConsultor({
  consultor_id,
  tipo = 'info',
  titulo,
  mensagem,
  link,
  importancia = 'normal',
}) {
  // 1. Inserir notificação
  const { error } = await supabaseAdmin
    .from('notificacoes_consultor')
    .insert([{ consultor_id, tipo, titulo, mensagem, link, importancia, lida: false }])

  if (error) {
    console.error('Erro ao criar notificação do consultor:', error.message)
    return { error }
  }

  // 2. Se importância alta, disparar e-mail
  if (importancia === 'alta') {
    try {
      const { data: consultor } = await supabaseAdmin
        .from('consultores')
        .select('email, nome, auth_id')
        .eq('id', consultor_id)
        .maybeSingle()

      if (consultor?.email) {
        await dispararEmail({
          auth_id: consultor.auth_id,
          destinatario_email: consultor.email,
          destinatario_nome: consultor.nome,
          tipo,
          titulo,
          mensagem,
          link,
        })
      }
    } catch (err) {
      console.error('Erro ao enviar e-mail para consultor:', err.message)
    }
  }

  return { success: true }
}

/**
 * Criar notificação para o cliente
 */
export async function criarNotificacaoCliente({
  cliente_id,
  tipo = 'info',
  titulo,
  mensagem,
  link,
  importancia = 'normal',
}) {
  // 1. Inserir notificação (exceto mensagens de chat, que já têm o balão flutuante)
  let error = null
  if (tipo !== 'mensagem') {
    const { error: insertError } = await supabaseAdmin
      .from('notificacoes_cliente')
      .insert([{ cliente_id, tipo, titulo, mensagem, link, importancia, lida: false }])
    error = insertError
  }

  if (error) {
    console.error('Erro ao criar notificação do cliente:', error.message)
    return { error }
  }

  // 2. Se importância alta, disparar e-mail
  if (importancia === 'alta') {
    try {
      const { data: cliente } = await supabaseAdmin
        .from('clientes')
        .select('email, nome, auth_id')
        .eq('id', cliente_id)
        .maybeSingle()

      if (cliente?.email) {
        await dispararEmail({
          auth_id: cliente.auth_id,
          destinatario_email: cliente.email,
          destinatario_nome: cliente.nome,
          tipo,
          titulo,
          mensagem,
          link,
        })
      }
    } catch (err) {
      console.error('Erro ao enviar e-mail para cliente:', err.message)
    }
  }

  return { success: true }
}

/**
 * Dispara e-mail com proteção anti-spam
 */
async function dispararEmail({ auth_id, destinatario_email, destinatario_nome, tipo, titulo, mensagem, link }) {
  // 1. Verificar preferências do usuário
  if (auth_id) {
    const { data: prefs } = await supabaseAdmin
      .from('preferencias_notificacao')
      .select('*')
      .eq('auth_id', auth_id)
      .maybeSingle()

    if (prefs) {
      // Verificar se e-mails estão desabilitados globalmente
      if (!prefs.emails_habilitados) return

      // Mapear tipo para preferência
      const tipoParaPref = {
        nova_mensagem: 'email_nova_mensagem',
        mensagem: 'email_msg_consultor',
        proposta: 'email_nova_proposta',
        novo_cliente: 'email_novo_cliente',
        test_drive: 'email_novo_agendamento',
        agendamento: 'email_agendamento_confirmado',
        comissao: 'email_comissao',
        status: 'email_atualizacao_status',
      }

      const prefKey = tipoParaPref[tipo]
      if (prefKey && prefs[prefKey] === false) return
    }
  }

  // 2. Verificar debounce anti-spam (30 minutos)
  const { data: emailRecente } = await supabaseAdmin
    .from('email_log')
    .select('id')
    .eq('destinatario_email', destinatario_email)
    .eq('tipo', tipo)
    .gte('enviado_em', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .limit(1)

  if (emailRecente && emailRecente.length > 0) {
    console.log(`Anti-spam: e-mail tipo '${tipo}' já enviado para ${destinatario_email} nos últimos 30min`)
    return
  }

  // 3. Enviar e-mail via Resend
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn('RESEND_API_KEY não configurada — e-mail não enviado')
    return
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(resendKey)

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'CarWise <onboarding@resend.dev>',
      to: [destinatario_email],
      subject: `CarWise: ${titulo}`,
      html: gerarTemplateEmail({ nome: destinatario_nome, titulo, mensagem, link }),
    })

    // 4. Registrar no log
    await supabaseAdmin.from('email_log').insert([{
      destinatario_email,
      tipo,
      titulo,
    }])

    console.log(`E-mail enviado para ${destinatario_email}: ${titulo}`)
  } catch (err) {
    console.error('Erro ao enviar e-mail via Resend:', err.message)
  }
}

/**
 * Template HTML bonito para os e-mails
 */
function gerarTemplateEmail({ nome, titulo, mensagem, link }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://carwise-eta.vercel.app'
  const urlDestino = link ? `${baseUrl}${link}` : `${baseUrl}/painel`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:32px 32px 28px;">
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;">
        <tr>
          <td style="width:32px;height:32px;border-radius:8px;background:#3b82f6;text-align:center;vertical-align:middle;padding:0;">
            <span style="color:#ffffff;font-size:14px;font-weight:900;line-height:32px;font-family:sans-serif;display:block;">CW</span>
          </td>
          <td style="padding-left:10px;vertical-align:middle;">
            <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.3px;">CarWise</span>
          </td>
        </tr>
      </table>
    </div>
    
    <!-- Content -->
    <div style="padding:32px;">
      <p style="color:#64748b;font-size:14px;margin:0 0 8px;">
        Olá${nome ? `, ${nome.split(' ')[0]}` : ''}
      </p>
      <h1 style="color:#0f172a;font-size:20px;font-weight:700;margin:0 0 16px;line-height:1.3;">
        ${titulo}
      </h1>
      ${mensagem ? `
      <div style="background:#f8fafc;border-left:3px solid #3b82f6;border-radius:0 8px 8px 0;padding:16px;margin:0 0 24px;">
        <p style="color:#334155;font-size:14px;margin:0;line-height:1.6;">
          ${mensagem}
        </p>
      </div>
      ` : ''}
      <a href="${urlDestino}" 
         style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
        Acessar CarWise →
      </a>
    </div>
    
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #f1f5f9;">
      <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.5;">
        Você recebeu este e-mail porque tem uma conta no CarWise. 
        Para ajustar suas preferências de notificação, acesse as configurações do seu painel.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
