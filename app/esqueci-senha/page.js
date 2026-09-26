'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function EsqueciSenha() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [email, setEmail] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    setSucesso(false)

    // A URL de redirecionamento para quando o usuário clicar no link do e-mail
    const redirectUrl = `${window.location.origin}/nova-senha`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    setLoading(false)

    if (error) {
      setErro('Não foi possível enviar o e-mail. Verifique se o endereço está correto.')
    } else {
      setSucesso(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="bg-white p-10 rounded-2xl shadow-[0_30px_60px_-24px_rgba(10,34,71,0.18)] border border-gray-100 w-full max-w-sm">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 transition mb-7 font-medium">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Voltar
        </button>

        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 11c0 3.5-3.5 6-6 6-1 0-2.5-.5-3.5-1.5C1.5 14.5 1 13 1 12s.5-2.5 1.5-3.5C3.5 7.5 5 7 6 7c2 0 4 1 5.5 2.5l.5 1.5" stroke="#2B5FE0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 11h9v9M17 11v6" stroke="#2B5FE0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>

        <h1 className="font-[family-name:var(--font-display)] font-bold text-[28px] text-blue-950 mb-1.5 leading-tight">Recuperar senha</h1>
        <p className="text-gray-400 text-sm mb-7">Digite seu e-mail para receber um link de redefinição.</p>

        {sucesso ? (
          <div className="bg-green-50 border border-green-100 rounded-lg p-5 text-center">
            <p className="text-green-700 text-sm font-medium mb-3">E-mail de recuperação enviado!</p>
            <p className="text-green-600 text-xs mb-5">Verifique sua caixa de entrada e a pasta de spam.</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-green-600 text-white rounded-lg py-3 font-semibold text-sm hover:bg-green-700 transition"
            >
              Voltar para o login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">E-mail</label>
              <input
                type="email"
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none transition"
              />
            </div>

            {erro && (
              <p className="text-red-600 text-sm mt-4 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">{erro}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-3.5 mt-6 font-semibold text-sm hover:bg-blue-700 hover:-translate-y-0.5 transition disabled:opacity-50 disabled:translate-y-0 shadow-sm"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
