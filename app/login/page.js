'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    setLoading(false)

    if (error) {
      setErro('E-mail ou senha incorretos.')
    } else {
      router.push('/painel')
    }
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

        <h1 className="text-2xl font-bold text-blue-900 mb-2">Entrar</h1>
        <p className="text-gray-500 text-sm mb-6">Acesse sua conta CarWise.</p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="E-mail"
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

        {erro && (
          <p className="text-red-600 text-sm mt-4">{erro}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-3 mt-6 font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-center text-sm text-gray-500 mt-5">
          Não tem conta?{' '}
          <a href="/cadastro" className="text-blue-600 font-medium">
            Cadastre-se
          </a>
        </p>
      </form>
    </div>
  )
}