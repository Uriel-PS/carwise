'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function NovaSenha() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [senha, setSenha] = useState('')

  // O Supabase Auth vai detectar o token na URL no cliente e criar a sessão
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Usuário autenticado via link de recuperação, pode definir nova senha
      }
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    setSucesso(false)

    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: senha
    })

    setLoading(false)

    if (error) {
      setErro('Não foi possível redefinir a senha. O link pode ter expirado.')
    } else {
      setSucesso(true)
      // Desloga o usuário e manda para o login
      setTimeout(async () => {
        await supabase.auth.signOut()
        router.push('/login')
      }, 3000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="bg-white p-10 rounded-2xl shadow-[0_30px_60px_-24px_rgba(10,34,71,0.18)] border border-gray-100 w-full max-w-sm">
        
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#2B5FE0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#2B5FE0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>

        <h1 className="font-[family-name:var(--font-display)] font-bold text-[28px] text-blue-950 mb-1.5 leading-tight">Nova senha</h1>
        <p className="text-gray-400 text-sm mb-7">Defina uma nova senha para a sua conta.</p>

        {sucesso ? (
          <div className="bg-green-50 border border-green-100 rounded-lg p-5 text-center">
            <p className="text-green-700 text-sm font-medium mb-3">Senha redefinida com sucesso!</p>
            <p className="text-green-600 text-xs mb-0">Redirecionando para o login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nova Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
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
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
