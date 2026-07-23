'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function LoginConcessionaria() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (authError) {
      setErro('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    const { data: concessionariaData, error: concessionariaError } = await supabase
      .from('concessionarias')
      .select('*')
      .eq('auth_id', authData.user.id)
      .eq('ativo', true)
      .maybeSingle()

    setLoading(false)

    if (concessionariaError || !concessionariaData) {
      setErro('Esta conta não tem acesso ao painel de concessionária.')
      await supabase.auth.signOut()
      return
    }

    router.push('/concessionaria/painel')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-sm"
      >
        <a href="/" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 mb-6 font-medium">
          ← Voltar
        </a>

        <h1 className="text-2xl font-bold text-blue-900 mb-2">Acesso da concessionária</h1>
        <p className="text-gray-500 text-sm mb-6">Entre para gerenciar seu estoque.</p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="E-mail da concessionária"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400"
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400"
          />
        </div>

        {erro && <p className="text-red-600 text-sm mt-4">{erro}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-600 text-white rounded-lg py-3 mt-6 font-semibold hover:bg-amber-700 transition disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar no painel'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-5">
          Ainda não é parceira? <a href="/contato?assunto=concessionaria" className="text-blue-600 font-medium">Fale conosco</a>
        </p>
      </form>
    </div>
  )
}