'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function ConfigCliente() {
  const router = useRouter()
  const [cliente, setCliente] = useState(null)
  const [carregando, setCarregando] = useState(true)

  // Estados da Conta
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [salvandoConta, setSalvandoConta] = useState(false)
  const [mensagemConta, setMensagemConta] = useState(null)

  // Estados da Senha
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [mensagemSenha, setMensagemSenha] = useState(null)

  // Estados das preferências de notificação
  const [prefsNotificacao, setPrefsNotificacao] = useState({
    emails_habilitados: true,
    email_nova_proposta: true,
    email_msg_consultor: true,
    email_atualizacao_status: true,
    email_agendamento_confirmado: true,
  })
  const [salvandoPrefs, setSalvandoPrefs] = useState(false)
  const [mensagemPrefs, setMensagemPrefs] = useState(null)
  const [authId, setAuthId] = useState(null)

  useEffect(() => {
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        router.push('/login')
        return
      }

      const user = sessionData.session.user

      const { data: clienteData } = await supabase
        .from('clientes')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle()

      if (!clienteData) {
        router.push('/login')
        return
      }

      setCliente(clienteData)
      setNome(clienteData.nome || '')
      setEmail(clienteData.email || user.email || '')
      setAuthId(user.id)

      // Carregar preferências de notificação
      try {
        const { data: prefsData } = await supabase
          .from('preferencias_notificacao')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle()

        if (prefsData) {
          setPrefsNotificacao(prev => ({ ...prev, ...prefsData }))
        }
      } catch {
        // Tabela pode não existir ainda
      }

      setCarregando(false)
    }

    carregar()
  }, [router])

  async function handleSalvarPrefs() {
    setSalvandoPrefs(true)
    setMensagemPrefs(null)

    try {
      const { data: existente } = await supabase
        .from('preferencias_notificacao')
        .select('id')
        .eq('auth_id', authId)
        .maybeSingle()

      const dadosPrefs = {
        auth_id: authId,
        emails_habilitados: prefsNotificacao.emails_habilitados,
        email_nova_proposta: prefsNotificacao.email_nova_proposta,
        email_msg_consultor: prefsNotificacao.email_msg_consultor,
        email_atualizacao_status: prefsNotificacao.email_atualizacao_status,
        email_agendamento_confirmado: prefsNotificacao.email_agendamento_confirmado,
        updated_at: new Date().toISOString(),
      }

      if (existente) {
        const { error } = await supabase
          .from('preferencias_notificacao')
          .update(dadosPrefs)
          .eq('auth_id', authId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('preferencias_notificacao')
          .insert([dadosPrefs])
        if (error) throw error
      }

      setMensagemPrefs({ tipo: 'sucesso', texto: 'Preferências salvas com sucesso!' })
    } catch (err) {
      setMensagemPrefs({ tipo: 'erro', texto: `Erro ao salvar: ${err.message}` })
    } finally {
      setSalvandoPrefs(false)
    }
  }

  async function handleSalvarConta(e) {
    e.preventDefault()
    setSalvandoConta(true)
    setMensagemConta(null)

    try {
      // 1. Atualizar e-mail na Auth (se foi alterado)
      if (email !== cliente.email) {
        const { error: authError } = await supabase.auth.updateUser({ email })
        if (authError) throw new Error(`Erro ao atualizar e-mail: ${authError.message}`)
      }

      // 2. Atualizar tabela clientes
      const { error: dbError } = await supabase
        .from('clientes')
        .update({ nome, email })
        .eq('id', cliente.id)

      if (dbError) throw new Error(`Erro ao atualizar dados: ${dbError.message}`)

      setCliente({ ...cliente, nome, email })
      
      if (email !== cliente.email) {
        setMensagemConta({
          tipo: 'sucesso',
          texto: 'Acesso atualizado! Um e-mail de confirmação foi enviado para o novo endereço. Você precisará confirmá-lo para que a alteração seja concluída.',
        })
      } else {
        setMensagemConta({ tipo: 'sucesso', texto: 'Informações de acesso atualizadas com sucesso!' })
      }
    } catch (err) {
      setMensagemConta({ tipo: 'erro', texto: err.message })
    } finally {
      setSalvandoConta(false)
    }
  }

  async function handleSalvarSenha(e) {
    e.preventDefault()
    setSalvandoSenha(true)
    setMensagemSenha(null)

    if (senha.length < 6) {
      setMensagemSenha({ tipo: 'erro', texto: 'A nova senha deve ter pelo menos 6 caracteres.' })
      setSalvandoSenha(false)
      return
    }

    if (senha !== confirmarSenha) {
      setMensagemSenha({ tipo: 'erro', texto: 'As senhas não coincidem.' })
      setSalvandoSenha(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: senha })
      if (error) throw new Error(error.message)

      setMensagemSenha({ tipo: 'sucesso', texto: 'Senha atualizada com sucesso!' })
      setSenha('')
      setConfirmarSenha('')
    } catch (err) {
      setMensagemSenha({ tipo: 'erro', texto: `Erro ao alterar senha: ${err.message}` })
    } finally {
      setSalvandoSenha(false)
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white/90 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/painel" className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-xl text-blue-950">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            CarWise
          </a>
          <a href="/painel" className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition">
            Voltar ao painel
          </a>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Segurança da Conta</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gerencie seu acesso e informações de login da plataforma.</p>
        </div>

        <div className="grid gap-6">
          {/* Cartão de Informações de Acesso */}
          <div className="bg-white rounded-2xl shadow-[0_20px_50px_-24px_rgba(10,34,71,0.15)] border border-gray-50 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-base">Credenciais de Acesso</h2>
              <p className="text-slate-500 text-xs mt-1">E-mail utilizado para fazer login.</p>
            </div>
            
            <form onSubmit={handleSalvarConta} className="p-6">
              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Como gosta de ser chamado?</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail de acesso</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 outline-none transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Ao alterar o e-mail, você precisará confirmar a alteração acessando a caixa de entrada do novo e-mail informado.
                  </p>
                </div>

                {mensagemConta && (
                  <div className={`p-3 rounded-xl text-sm ${mensagemConta.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {mensagemConta.texto}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={salvandoConta}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition disabled:opacity-70 shadow-sm"
                  >
                    {salvandoConta ? 'Salvando...' : 'Salvar credenciais'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Cartão de Segurança */}
          <div className="bg-white rounded-2xl shadow-[0_20px_50px_-24px_rgba(10,34,71,0.15)] border border-gray-50 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-base">Alterar Senha</h2>
              <p className="text-slate-500 text-xs mt-1">Sua nova senha precisa ter pelo menos 6 caracteres.</p>
            </div>
            
            <form onSubmit={handleSalvarSenha} className="p-6">
              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nova senha</label>
                  <input
                    type="password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 outline-none transition"
                    placeholder="Mínimo de 6 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirmar nova senha</label>
                  <input
                    type="password"
                    required
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 outline-none transition"
                    placeholder="Repita a senha"
                  />
                </div>

                {mensagemSenha && (
                  <div className={`p-3 rounded-xl text-sm ${mensagemSenha.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {mensagemSenha.texto}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={salvandoSenha || !senha || !confirmarSenha}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition disabled:opacity-70 shadow-sm"
                  >
                    {salvandoSenha ? 'Atualizando...' : 'Atualizar senha'}
                  </button>
                </div>
              </div>
            </form>
          </div>

        {/* Cartão de Preferências de Notificação */}
        <div className="bg-white rounded-2xl shadow-[0_20px_50px_-24px_rgba(10,34,71,0.15)] border border-gray-50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔔</span>
              <div>
                <h2 className="font-bold text-slate-800 text-base">Notificações por E-mail</h2>
                <p className="text-slate-500 text-xs mt-1">Escolha quais alertas você quer receber no seu e-mail.</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4 max-w-xl">
              {/* Toggle global */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <div>
                  <p className="text-sm font-semibold text-slate-800">E-mails habilitados</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Desative para não receber nenhum e-mail</p>
                </div>
                <ToggleSwitch
                  ativo={prefsNotificacao.emails_habilitados}
                  onChange={(v) => setPrefsNotificacao(prev => ({ ...prev, emails_habilitados: v }))}
                />
              </div>

              {prefsNotificacao.emails_habilitados && (
                <div className="space-y-2.5 pl-1">
                  <TogglePreferencia
                    label="Novas propostas"
                    descricao="Quando seu consultor encontrar um veículo para você"
                    ativo={prefsNotificacao.email_nova_proposta}
                    onChange={(v) => setPrefsNotificacao(prev => ({ ...prev, email_nova_proposta: v }))}
                  />
                  <TogglePreferencia
                    label="Mensagens do consultor"
                    descricao="Quando seu consultor enviar uma mensagem no chat"
                    ativo={prefsNotificacao.email_msg_consultor}
                    onChange={(v) => setPrefsNotificacao(prev => ({ ...prev, email_msg_consultor: v }))}
                  />
                  <TogglePreferencia
                    label="Atualizações de status"
                    descricao="Quando o status da sua consultoria mudar"
                    ativo={prefsNotificacao.email_atualizacao_status}
                    onChange={(v) => setPrefsNotificacao(prev => ({ ...prev, email_atualizacao_status: v }))}
                  />
                  <TogglePreferencia
                    label="Agendamentos confirmados"
                    descricao="Quando um test drive ou vistoria for confirmado"
                    ativo={prefsNotificacao.email_agendamento_confirmado}
                    onChange={(v) => setPrefsNotificacao(prev => ({ ...prev, email_agendamento_confirmado: v }))}
                  />
                </div>
              )}

              {mensagemPrefs && (
                <div className={`p-3 rounded-xl text-sm ${mensagemPrefs.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {mensagemPrefs.texto}
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleSalvarPrefs}
                  disabled={salvandoPrefs}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition disabled:opacity-70 shadow-sm"
                >
                  {salvandoPrefs ? 'Salvando...' : 'Salvar preferências'}
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

function ToggleSwitch({ ativo, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!ativo)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        ativo ? 'bg-blue-600' : 'bg-slate-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          ativo ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function TogglePreferencia({ label, descricao, ativo, onChange }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {descricao && <p className="text-[11px] text-slate-400 mt-0.5">{descricao}</p>}
      </div>
      <ToggleSwitch ativo={ativo} onChange={onChange} />
    </div>
  )
}
