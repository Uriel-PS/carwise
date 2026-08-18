'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function ConfigConcessionaria() {
  const router = useRouter()
  const [concessionaria, setConcessionaria] = useState(null)
  const [carregando, setCarregando] = useState(true)

  // Estados do Perfil
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [telefone, setTelefone] = useState('')
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
        router.push('/concessionaria/login')
        return
      }

      const user = sessionData.session.user

      const { data: concessionariaData } = await supabase
        .from('concessionarias')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle()

      if (!concessionariaData) {
        router.push('/concessionaria/login')
        return
      }

      setConcessionaria(concessionariaData)
      setNomeFantasia(concessionariaData.nome_fantasia || '')
      setResponsavel(concessionariaData.responsavel || '')
      setTelefone(concessionariaData.telefone || '')
      setEmail(concessionariaData.email || user.email || '')
      setCarregando(false)
    }

    carregar()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/concessionaria/login')
  }

  async function handleSalvarPerfil(e) {
    e.preventDefault()
    setSalvandoPerfil(true)
    setMensagemPerfil(null)

    try {
      // 1. Atualizar e-mail na Auth (se foi alterado)
      if (email !== concessionaria.email) {
        const { error: authError } = await supabase.auth.updateUser({ email })
        if (authError) throw new Error(`Erro ao atualizar e-mail: ${authError.message}`)
      }

      // 2. Atualizar tabela concessionarias
      const { error: dbError } = await supabase
        .from('concessionarias')
        .update({ 
          nome_fantasia: nomeFantasia, 
          responsavel: responsavel,
          telefone: telefone,
          email 
        })
        .eq('id', concessionaria.id)

      if (dbError) throw new Error(`Erro ao atualizar dados: ${dbError.message}`)

      setConcessionaria({ ...concessionaria, nome_fantasia: nomeFantasia, responsavel, telefone, email })
      
      if (email !== concessionaria.email) {
        setMensagemPerfil({
          tipo: 'sucesso',
          texto: 'Perfil atualizado! Um e-mail de confirmação foi enviado para o novo endereço. Você precisará confirmá-lo para que a alteração seja concluída.',
        })
      } else {
        setMensagemPerfil({ tipo: 'sucesso', texto: 'Informações atualizadas com sucesso!' })
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
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header idêntico ao do painel */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-lg text-blue-950 hover:text-blue-700 transition">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              CarWise
            </a>
            <span className="text-[11px] font-mono font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">Concessionária</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/concessionaria/painel" className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition">Voltar ao painel</a>
            <button onClick={handleLogout} className="text-sm font-semibold text-gray-500 hover:text-red-600 transition">Sair</button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8 flex items-center gap-2">
          <a href="/concessionaria/painel" className="text-gray-400 hover:text-blue-600 transition">
             <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Configurações da Loja</h1>
            <p className="text-slate-500 text-sm mt-0.5">Gerencie os dados da concessionária e segurança de acesso.</p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Cartão de Informações Pessoais */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-base">Dados Básicos</h2>
              <p className="text-slate-500 text-xs mt-1">Atualize as informações de contato da loja.</p>
            </div>
            
            <form onSubmit={handleSalvarPerfil} className="p-6">
              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome fantasia</label>
                  <input
                    type="text"
                    required
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Responsável</label>
                    <input
                      type="text"
                      required
                      value={responsavel}
                      onChange={(e) => setResponsavel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telefone</label>
                    <input
                      type="text"
                      required
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 outline-none transition"
                    />
                  </div>
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
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition disabled:opacity-70"
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
                    className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition disabled:opacity-70"
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
