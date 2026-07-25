'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function LoginAdmin() {
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

    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('auth_id', authData.user.id)
      .eq('ativo', true)
      .maybeSingle()

    setLoading(false)

    if (adminError || !adminData) {
      setErro('Esta conta não tem acesso administrativo.')
      await supabase.auth.signOut()
      return
    }

    router.push('/admin/painel')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-10 rounded-2xl shadow-[0_30px_60px_-24px_rgba(10,34,71,0.18)] border border-gray-100 w-full max-w-sm"
      >
        <a href="/acesso-interno" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 transition mb-7 font-medium">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Voltar
        </a>

        <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l7.5 4v6c0 5-3.5 8.5-7.5 10-4-1.5-7.5-5-7.5-10V6l7.5-4z" stroke="#B07830" strokeWidth="1.6" strokeLinejoin="round"/></svg>
        </div>

        <h1 className="font-[family-name:var(--font-display)] font-bold text-[28px] text-blue-950 mb-1.5 leading-tight">Acesso administrativo</h1>
        <p className="text-gray-400 text-sm mb-7">Painel de gestão da operação CarWise.</p>

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">E-mail administrativo</label>
            <input
              type="email"
              placeholder="admin@carwise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-amber-400 focus:outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-amber-400 focus:outline-none transition"
            />
          </div>
        </div>

        {erro && (
          <p className="text-red-600 text-sm mt-4 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">{erro}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-600 text-white rounded-lg py-3.5 mt-6 font-semibold text-sm hover:bg-amber-700 hover:-translate-y-0.5 transition disabled:opacity-50 disabled:translate-y-0 shadow-sm"
        >
          {loading ? 'Entrando...' : 'Entrar como admin'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-6">
          Acesso restrito. Todas as sessões são registradas.
        </p>
      </form>
    </div>
  )
}