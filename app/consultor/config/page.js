'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function ConsultorConfiguracoes() {
  const router = useRouter()
  const [consultor, setConsultor] = useState(null)
  const [carregando, setCarregando] = useState(true)

  // Estados do Perfil
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)
  const [mensagemPerfil, setMensagemPerfil] = useState(null)

  // Estados da Senha
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [mensagemSenha, setMensagemSenha] = useState(null)

  useEffect(() => {
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        router.push('/consultor/login')
        return
      }

      const user = sessionData.session.user

      const { data: consultorData } = await supabase
        .from('consultores')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle()

      if (!consultorData) {
        router.push('/consultor/login')
        return
      }

      setConsultor(consultorData)
      setNome(consultorData.nome || '')
      setEmail(consultorData.email || user.email || '')
      setCarregando(false)
    }

    carregar()
  }, [router])

  async function handleSalvarPerfil(e) {
    e.preventDefault()
    setSalvandoPerfil(true)
    setMensagemPerfil(null)

    try {
      // 1. Atualizar e-mail na Auth (se foi alterado)
      if (email !== consultor.email) {
        const { error: authError } = await supabase.auth.updateUser({ email })
        if (authError) throw new Error(`Erro ao atualizar e-mail: ${authError.message}`)
      }

      // 2. Atualizar tabela consultores
      const { error: dbError } = await supabase
        .from('consultores')
        .update({ nome, email })
        .eq('id', consultor.id)

      if (dbError) throw new Error(`Erro ao atualizar dados: ${dbError.message}`)

      setConsultor({ ...consultor, nome, email })
      
      if (email !== consultor.email) {
        setMensagemPerfil({
          tipo: 'sucesso',
          texto: 'Perfil atualizado! Um e-mail de confirmação foi enviado para o novo endereço. Você precisará confirmá-lo para que a alteração seja concluída.',
        })
      } else {
        setMensagemPerfil({ tipo: 'sucesso', texto: 'Informações pessoais atualizadas com sucesso!' })
      }
    } catch (err) {
      setMensagemPerfil({ tipo: 'erro', texto: err.message })
    } finally {
      setSalvandoPerfil(false)
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
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded-lg w-72" />
          <div className="h-64 bg-slate-200 rounded-2xl max-w-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie suas informações pessoais e preferências de segurança.</p>
      </div>

      <div className="grid gap-6">
        {/* Cartão de Informações Pessoais */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 text-base">Informações Pessoais</h2>
            <p className="text-slate-500 text-xs mt-1">Atualize seu nome e e-mail de acesso ao painel.</p>
          </div>
          
          <form onSubmit={handleSalvarPerfil} className="p-6">
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome completo</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                  placeholder="seu.email@exemplo.com"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Ao alterar o e-mail, você precisará confirmar a alteração no novo endereço de e-mail enviado.
                </p>
              </div>

              {mensagemPerfil && (
                <div className={`p-3 rounded-xl text-sm ${mensagemPerfil.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {mensagemPerfil.texto}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={salvandoPerfil}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {salvandoPerfil ? 'Salvando...' : 'Salvar informações'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Cartão de Segurança */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 text-base">Segurança</h2>
            <p className="text-slate-500 text-xs mt-1">Altere a sua senha de acesso à plataforma.</p>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
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
                  className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {salvandoSenha ? 'Atualizando...' : 'Atualizar senha'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
