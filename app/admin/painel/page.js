'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function PainelAdmin() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [clientes, setClientes] = useState([])
  const [consultores, setConsultores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  // Formulário de novo consultor
  const [mostrarForm, setMostrarForm] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  async function carregarTudo() {
    const { data: sessionData } = await supabase.auth.getSession()

    if (!sessionData.session) {
      router.push('/admin/login')
      return
    }

    const user = sessionData.session.user

    const { data: adminData } = await supabase
      .from('admins')
      .select('*')
      .eq('auth_id', user.id)
      .eq('ativo', true)
      .maybeSingle()

    if (!adminData) {
      router.push('/admin/login')
      return
    }

    setAdmin(adminData)

    const [rClientes, rConsultores] = await Promise.all([
      supabase.from('clientes').select('id, nome, email, created_at').order('created_at', { ascending: false }),
      supabase.from('consultores').select('*').order('created_at', { ascending: false }),
    ])

    if (rClientes.error) setErro(rClientes.error.message)
    setClientes(rClientes.data || [])
    setConsultores(rConsultores.data || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarTudo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  async function criarConsultor(e) {
    e.preventDefault()
    setSalvando(true)
    setErroForm('')

    const resposta = await fetch('/api/criar-consultor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome, email: novoEmail, senha: novaSenha }),
    })

    const resultado = await resposta.json()
    setSalvando(false)

    if (!resposta.ok) {
      setErroForm(resultado.error || 'Erro ao criar consultor.')
      return
    }

    setNovoNome('')
    setNovoEmail('')
    setNovaSenha('')
    setMostrarForm(false)
    carregarTudo()
  }

  async function alternarAtivo(consultorId, ativoAtual) {
    await supabase
      .from('consultores')
      .update({ ativo: !ativoAtual })
      .eq('id', consultorId)
    carregarTudo()
  }

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
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <div className="font-bold text-blue-950">CarWise <span className="text-xs font-mono font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full ml-1">Admin</span></div>
            <div className="text-xs text-gray-400">{admin?.nome}</div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-red-100 transition"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          <Metrica label="Clientes cadastrados" valor={clientes.length} />
          <Metrica label="Consultores ativos" valor={consultores.filter(c => c.ativo).length} />
          <Metrica label="Consultores inativos" valor={consultores.filter(c => !c.ativo).length} />
        </div>

        {erro && (
          <p className="text-red-600 text-sm mb-5 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>
        )}

        {/* Gestão de consultores */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-blue-950 text-lg">Consultores</h2>
            <button
              onClick={() => setMostrarForm(!mostrarForm)}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {mostrarForm ? 'Cancelar' : '+ Novo consultor'}
            </button>
          </div>

          {mostrarForm && (
            <form onSubmit={criarConsultor} className="bg-blue-50/50 rounded-xl p-6 mb-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text" placeholder="Nome completo" required
                  value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400"
                />
                <input
                  type="email" placeholder="E-mail" required
                  value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400"
                />
              </div>
              <input
                type="password" placeholder="Senha temporária (mínimo 6 caracteres)" required minLength={6}
                value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400"
              />
              {erroForm && <p className="text-red-600 text-xs">{erroForm}</p>}
              <button
                type="submit" disabled={salvando}
                className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {salvando ? 'Criando...' : 'Criar consultor'}
              </button>
            </form>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="py-2 font-semibold">Nome</th>
                <th className="py-2 font-semibold">E-mail</th>
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {consultores.map((c) => (
                <tr key={c.id} className="border-t border-gray-50">
                  <td className="py-3 font-medium text-blue-950">{c.nome}</td>
                  <td className="py-3 text-gray-600">{c.email}</td>
                  <td className="py-3">
                    <span className={`text-xs font-mono px-2.5 py-1 rounded-full ${c.ativo ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {c.ativo ? 'ativo' : 'inativo'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => alternarAtivo(c.id, c.ativo)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      {c.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
              {consultores.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-gray-400">Nenhum consultor cadastrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Clientes recentes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="font-semibold text-blue-950 text-lg mb-6">Clientes recentes</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="py-2 font-semibold">Nome</th>
                <th className="py-2 font-semibold">E-mail</th>
                <th className="py-2 font-semibold">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {clientes.slice(0, 10).map((c) => (
                <tr key={c.id} className="border-t border-gray-50">
                  <td className="py-3 font-medium text-blue-950">{c.nome}</td>
                  <td className="py-3 text-gray-600">{c.email}</td>
                  <td className="py-3 text-gray-400 text-xs">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}

function Metrica({ label, valor }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
      <div className="text-3xl font-bold text-blue-950 mb-1">{valor}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}