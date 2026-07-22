'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function PainelConsultor() {
  const router = useRouter()
  const [consultor, setConsultor] = useState(null)
  const [clientes, setClientes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        router.push('/consultor/login')
        return
      }

      const user = sessionData.session.user

      const { data: consultorData, error: consultorError } = await supabase
        .from('consultores')
        .select('*')
        .eq('auth_id', user.id)
        .eq('ativo', true)
        .maybeSingle()

      if (consultorError || !consultorData) {
        router.push('/consultor/login')
        return
      }

      setConsultor(consultorData)

      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select(`
          id, nome, email, telefone, cidade, estado, created_at,
          clientes_financeiro ( valor_disponivel, forma_pagamento ),
          clientes_preferencias ( categoria )
        `)
        .order('created_at', { ascending: false })

      if (clientesError) {
        setErro('Erro ao carregar clientes: ' + clientesError.message)
      } else {
        setClientes(clientesData)
      }

      setCarregando(false)
    }

    carregar()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/consultor/login')
  }

  const clientesFiltrados = clientes.filter((c) =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.email?.toLowerCase().includes(busca.toLowerCase()) ||
    c.cidade?.toLowerCase().includes(busca.toLowerCase())
  )

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <div className="font-bold text-blue-950">CarWise <span className="text-xs font-mono font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full ml-1">Consultor</span></div>
            <div className="text-xs text-gray-400">{consultor?.nome}</div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-red-100 transition"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-950 mb-1">Clientes cadastrados</h1>
            <p className="text-gray-500 text-sm">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} no total</p>
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou cidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm w-72 text-gray-900 placeholder-gray-400"
          />
        </div>

        {erro && (
          <p className="text-red-600 text-sm mb-5 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3 font-semibold">Nome</th>
                <th className="px-6 py-3 font-semibold">Contato</th>
                <th className="px-6 py-3 font-semibold">Cidade</th>
                <th className="px-6 py-3 font-semibold">Procura</th>
                <th className="px-6 py-3 font-semibold">Orçamento</th>
                <th className="px-6 py-3 font-semibold">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/consultor/cliente/${c.id}`)}
                  className="border-t border-gray-50 hover:bg-blue-50/40 transition cursor-pointer"
                >
                  <td className="px-6 py-4 font-medium text-blue-950">{c.nome}</td>
                  <td className="px-6 py-4 text-gray-600">
                    <div>{c.email}</div>
                    <div className="text-xs text-gray-400">{c.telefone || '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{c.cidade ? `${c.cidade}/${c.estado}` : '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{c.clientes_preferencias?.[0]?.categoria || '—'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {c.clientes_financeiro?.[0]?.valor_disponivel
                      ? Number(c.clientes_financeiro[0].valor_disponivel).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
              {clientesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}