'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function CatalogoAdmin() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [veiculos, setVeiculos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroCambio, setFiltroCambio] = useState('')
  const [filtroPrecoMax, setFiltroPrecoMax] = useState('')

  useEffect(() => {
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/admin/login'); return }

      const user = sessionData.session.user

      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('auth_id', user.id)
        .eq('ativo', true)
        .maybeSingle()

      if (!adminData) { router.push('/admin/login'); return }
      setAdmin(adminData)

      const { data: veiculosData, error: veiculosError } = await supabase
        .from('veiculos')
        .select(`
          id, marca, modelo, versao, ano_fabricacao, ano_modelo, cor, cambio,
          combustivel, categoria, km, preco, preco_negociacao, status,
          concessionarias ( nome_fantasia, cidade, estado, telefone )
        `)
        .order('created_at', { ascending: false })

      if (veiculosError) setErro(veiculosError.message)
      setVeiculos(veiculosData || [])
      setCarregando(false)
    }
    carregar()
  }, [router])

  const categorias = [...new Set(veiculos.map((v) => v.categoria).filter(Boolean))]

  const veiculosFiltrados = veiculos.filter((v) => {
    const bateBusca = !busca ||
      v.marca?.toLowerCase().includes(busca.toLowerCase()) ||
      v.modelo?.toLowerCase().includes(busca.toLowerCase()) ||
      v.concessionarias?.nome_fantasia?.toLowerCase().includes(busca.toLowerCase())

    const bateCategoria = !filtroCategoria || v.categoria === filtroCategoria
    const bateCambio = !filtroCambio || v.cambio === filtroCambio
    const batePreco = !filtroPrecoMax || (v.preco && Number(v.preco) <= Number(filtroPrecoMax))

    return bateBusca && bateCategoria && bateCambio && batePreco
  })

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-lg text-blue-950 hover:text-blue-700 transition">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              CarWise
            </a>
            <span className="text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">Admin</span>
          </div>
          <a href="/admin/painel" className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition">
            ← Voltar ao painel
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-blue-950 mb-1">Catálogo completo (Estoque)</h1>
        <p className="text-gray-400 text-sm mb-6">{veiculosFiltrados.length} de {veiculos.length} veículos de todas as concessionárias parceiras</p>

        {erro && <p className="text-red-600 text-sm mb-5 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>}

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Buscar marca, modelo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none"
          />
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filtroCambio}
            onChange={(e) => setFiltroCambio(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
          >
            <option value="">Qualquer câmbio</option>
            <option>Automático</option>
            <option>Manual</option>
            <option>CVT</option>
            <option>Automatizado</option>
          </select>
          <input
            type="text"
            placeholder="Preço máximo"
            value={filtroPrecoMax}
            onChange={(e) => setFiltroPrecoMax(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none"
          />
        </div>

        {/* Grid de veículos */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {veiculosFiltrados.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-blue-950">{v.marca} {v.modelo} {v.versao}</h3>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full shrink-0 ${v.status === 'ativo' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {v.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">{v.ano_fabricacao}/{v.ano_modelo} · {v.km ? `${v.km} km` : '—'} · {v.cor}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {v.categoria && <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md">{v.categoria}</span>}
                <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md">{v.cambio}</span>
                <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md">{v.combustivel}</span>
              </div>
              <p className="text-lg font-bold text-blue-950 mb-1">
                {v.preco ? Number(v.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—'}
              </p>
              {v.preco_negociacao && (
                <p className="text-xs text-amber-700 font-mono mb-2">mín. negociação: {Number(v.preco_negociacao).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</p>
              )}
              <p className="text-xs text-gray-400 border-t border-gray-50 pt-3 mt-2">
                {v.concessionarias?.nome_fantasia} · {v.concessionarias?.cidade}/{v.concessionarias?.estado}
              </p>
            </div>
          ))}
          {veiculosFiltrados.length === 0 && (
            <div className="col-span-full text-center text-gray-400 text-sm py-14">Nenhum veículo encontrado com esses filtros.</div>
          )}
        </div>
      </div>
    </div>
  )
}
