'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function Cadastro() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    cidade: '',
    estado: '',
    senha: '',
  })

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    // 1. Cria a conta de autenticação (login/senha)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
    })

    if (authError) {
      setErro(authError.message)
      setLoading(false)
      return
    }

    const authId = authData.user?.id

    // 2. Cria o perfil na tabela clientes, já linkado à conta criada
    const { error: perfilError } = await supabase
      .from('clientes')
      .insert([{
        auth_id: authId,
        nome: form.nome,
        cpf: form.cpf,
        email: form.email,
        telefone: form.telefone,
        cidade: form.cidade,
        estado: form.estado,
      }])

    setLoading(false)

    if (perfilError) {
      setErro('Conta criada, mas houve um erro ao salvar o perfil: ' + perfilError.message)
      return
    }

    // 3. Redireciona para o painel (já autenticado após o signUp)
    router.push('/painel')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-md"
      >
        <a href="/" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 mb-6 font-medium">
          ← Voltar
        </a>

        <h1 className="text-2xl font-bold text-blue-900 mb-2">Criar seu perfil</h1>
        <p className="text-gray-500 text-sm mb-6">Preencha seus dados para começar.</p>

        <div className="space-y-4">
          <input
            name="nome"
            placeholder="Nome completo"
            value={form.nome}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400"
          />
          <input
            name="cpf"
            placeholder="CPF"
            value={form.cpf}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400"
          />
          <input
            name="email"
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400"
          />
          <input
            name="senha"
            type="password"
            placeholder="Crie uma senha"
            value={form.senha}
            onChange={handleChange}
            required
            minLength={6}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400"
          />
          <input
            name="telefone"
            placeholder="Telefone / WhatsApp"
            value={form.telefone}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400"
          />
          <div className="flex gap-3">
            <input
              name="cidade"
              placeholder="Cidade"
              value={form.cidade}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400"
            />
            <input
              name="estado"
              placeholder="UF"
              value={form.estado}
              onChange={handleChange}
              maxLength={2}
              className="w-20 border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>

        {erro && (
          <p className="text-red-600 text-sm mt-4">{erro}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-3 mt-6 font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Criando conta...' : 'Criar perfil'}
        </button>

        <p className="text-center text-sm text-gray-500 mt-5">
          Já tem conta?{' '}
          <a href="/login" className="text-blue-600 font-medium">
            Entrar
          </a>
        </p>
      </form>
    </div>
  )
}