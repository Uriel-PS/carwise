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
      setCarregando(false)
    }

    carregar()
  }, [router])

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
        </div>
      </div>
    </div>
  )
}
