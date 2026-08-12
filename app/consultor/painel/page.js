'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function PainelConsultor() {
  const router = useRouter()
  const [consultor, setConsultor] = useState(null)
  const [clientes, setClientes] = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [aba, setAba] = useState('clientes')
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos')
const [mensagensNaoLidas, setMensagensNaoLidas] = useState({})

  async function carregarTudo() {
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
    id, nome, email, telefone, cidade, estado, created_at, consultor_id,
    clientes_financeiro ( forma_pagamento ),
    clientes_preferencias ( categoria, preco_max ),
    consultores ( nome ),
    pagamentos ( plano, status )
  `)
  .order('created_at', { ascending: false })

	// Busca contagem de mensagens não lidas por cliente
    const { data: naoLidasData } = await supabase
      .from('mensagens_chat')
      .select('cliente_id')
      .eq('autor_tipo', 'cliente')
      .eq('lida', false)

    const contagemPorCliente = {}
    if (naoLidasData) {
      naoLidasData.forEach((m) => {
        contagemPorCliente[m.cliente_id] = (contagemPorCliente[m.cliente_id] || 0) + 1
      })
    }
    setMensagensNaoLidas(contagemPorCliente)

    if (clientesError) {
      setErro('Erro ao carregar clientes: ' + clientesError.message)
    } else {
      setClientes(clientesData)
    }

    const { data: veiculosData, error: veiculosError } = await supabase
      .from('veiculos')
      .select(`
        id, marca, modelo, versao, ano_fabricacao, ano_modelo, cor, cambio,
        combustivel, km, preco, preco_negociacao, status, created_at,
        concessionarias ( nome_fantasia, cidade, estado )
      `)
      .order('created_at', { ascending: false })

    if (veiculosError) {
      setErro((prev) => prev || ('Erro ao carregar veículos: ' + veiculosError.message))
    } else {
      setVeiculos(veiculosData)
    }

    setCarregando(false)
  }

  useEffect(() => {
    carregarTudo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/consultor/login')
  }

  async function assumirCliente(clienteId) {
    const { error } = await supabase
      .from('clientes')
      .update({ consultor_id: consultor.id })
      .eq('id', clienteId)

    if (error) {
      alert('Não foi possível assumir este cliente: ' + error.message)
      return
    }

    carregarTudo()
  }

  const clientesFiltrados = clientes
    .filter((c) =>
      c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      c.email?.toLowerCase().includes(busca.toLowerCase()) ||
      c.cidade?.toLowerCase().includes(busca.toLowerCase())
    )
    .filter((c) => {
      if (filtroResponsavel === 'meus') return c.consultor_id === consultor?.id
      if (filtroResponsavel === 'sem-consultor') return !c.consultor_id
      return true
    })

  const veiculosFiltrados = veiculos.filter((v) =>
    v.marca?.toLowerCase().includes(busca.toLowerCase()) ||
    v.modelo?.toLowerCase().includes(busca.toLowerCase()) ||
    v.concessionarias?.nome_fantasia?.toLowerCase().includes(busca.toLowerCase())
  )

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
            <span className="text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">Consultor</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">{consultor?.nome}</span>
            <button
              onClick={handleLogout}
              className="text-sm font-semibold text-gray-500 hover:text-red-600 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Abas */}
	<a
	href="/consultor/catalogo"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 text-blue-950 text-sm font-semibold px-4 py-2 rounded-lg hover:border-blue-300 transition mb-4"
        >
          Ver catálogo completo de veículos →
        </a>

	<a href="/consultor/agenda" className="inline-flex items-center gap-2 bg-white border border-gray-200 text-blue-950 text-sm font-semibold px-4 py-2 rounded-lg hover:border-blue-300 transition mb-4 ml-3">
          Ver minha agenda →
        </a>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setAba('clientes')}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition ${aba === 'clientes' ? 'bg-blue-950 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300'}`}
          >
            Clientes
          </button>
          <button
            onClick={() => setAba('estoque')}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition ${aba === 'estoque' ? 'bg-blue-950 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300'}`}
          >
            Estoque
          </button>
        </div>

        <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-blue-950 mb-1">
              {aba === 'clientes' ? 'Clientes cadastrados' : 'Estoque de veículos'}
            </h1>
            <p className="text-gray-400 text-sm">
              {aba === 'clientes'
                ? `${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} no total`
                : `${veiculos.length} veículo${veiculos.length !== 1 ? 's' : ''} de todas as concessionárias parceiras`}
            </p>
          </div>
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#9CA3AF" strokeWidth="1.8"/><path d="M21 21l-4.35-4.35" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"/></svg>
            <input
              type="text"
              placeholder={aba === 'clientes' ? 'Buscar por nome, e-mail ou cidade...' : 'Buscar por marca, modelo ou concessionária...'}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm w-72 text-gray-900 placeholder-gray-400 bg-white focus:border-blue-400 focus:outline-none transition"
            />
          </div>
        </div>

        {erro && (
          <p className="text-red-600 text-sm mb-5 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>
        )}

        {aba === 'clientes' && (
          <>
            <div className="flex gap-2 mb-4">
              <ChipFiltro ativo={filtroResponsavel === 'todos'} onClick={() => setFiltroResponsavel('todos')}>Todos</ChipFiltro>
              <ChipFiltro ativo={filtroResponsavel === 'meus'} onClick={() => setFiltroResponsavel('meus')}>Meus clientes</ChipFiltro>
              <ChipFiltro ativo={filtroResponsavel === 'sem-consultor'} onClick={() => setFiltroResponsavel('sem-consultor')}>Sem consultor</ChipFiltro>
            </div>

            {(() => {
              let recentItems = []
              try {
                recentItems = JSON.parse(localStorage.getItem('recent_clients_consultor') || '[]')
              } catch (e) {}

              // Backward compatibility: some might be strings, new ones are objects
              const recentMap = {}
              recentItems.forEach((item, index) => {
                const id = typeof item === 'object' ? item.id : item
                const ts = typeof item === 'object' ? item.timestamp : null
                recentMap[String(id)] = { index, timestamp: ts }
              })

              const sortByRecent = (a, b) => {
                const itemA = recentMap[String(a.id)]
                const itemB = recentMap[String(b.id)]
                if (itemA && itemB) return itemA.index - itemB.index
                if (itemA) return -1
                if (itemB) return 1
                return new Date(b.created_at) - new Date(a.created_at) // default
              }

              // Inject timestamp into client object for UI
              const clientesSorted = [...clientesFiltrados].map(c => ({
                ...c,
                ultimoAcesso: recentMap[String(c.id)]?.timestamp
              })).sort(sortByRecent)

              const clientesComPlano = clientesSorted.filter(c => c.pagamentos?.some(p => p.status === 'confirmado'))
              const clientesSemPlano = clientesSorted.filter(c => !c.pagamentos?.some(p => p.status === 'confirmado'))

              return (
                <>
                  <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">Clientes com Plano Ativo</h2>
                  <SecaoTabela maxHeight="600px">
                    <TabelaClientes 
                      clientes={clientesComPlano} 
                      router={router} 
                      mensagensNaoLidas={mensagensNaoLidas} 
                      assumirCliente={assumirCliente} 
                    />
                  </SecaoTabela>

                  <h2 className="text-sm font-bold text-gray-700 mb-2 px-1 mt-8">Demais Clientes (Sem Plano)</h2>
                  <SecaoTabela maxHeight="220px">
                    <TabelaClientes 
                      clientes={clientesSemPlano} 
                      router={router} 
                      mensagensNaoLidas={mensagensNaoLidas} 
                      assumirCliente={assumirCliente} 
                    />
                  </SecaoTabela>
                </>
              )
            })()}
          </>
        )}

        {aba === 'estoque' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70 text-left text-[11px] text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5 font-semibold">Veículo</th>
                  <th className="px-6 py-3.5 font-semibold">Concessionária</th>
                  <th className="px-6 py-3.5 font-semibold">Detalhes</th>
                  <th className="px-6 py-3.5 font-semibold">Preço anunciado</th>
                  <th className="px-6 py-3.5 font-semibold">Preço mínimo <span className="normal-case font-normal text-gray-300">(privado)</span></th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {veiculosFiltrados.map((v) => (
                  <tr key={v.id} className="border-t border-gray-50 hover:bg-blue-50/30 transition">
                    <td className="px-6 py-4 font-medium text-blue-950">
                      {v.marca} {v.modelo} {v.versao}
                      <div className="text-xs text-gray-400 font-normal">{v.ano_fabricacao}/{v.ano_modelo}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {v.concessionarias?.nome_fantasia || '—'}
                      <div className="text-xs text-gray-400">{v.concessionarias?.cidade}/{v.concessionarias?.estado}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {v.cambio} · {v.combustivel}<br />
                      {v.km ? `${v.km} km` : '—'} · {v.cor}
                    </td>
                    <td className="px-6 py-4 text-gray-800 font-medium">
                      {v.preco ? Number(v.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—'}
                    </td>
                    <td className="px-6 py-4 text-amber-700 font-medium">
                      {v.preco_negociacao ? Number(v.preco_negociacao).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-mono px-2.5 py-1 rounded-full ${v.status === 'ativo' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {veiculosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-gray-400 text-sm">
                      Nenhum veículo encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}

function ChipFiltro({ ativo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition ${ativo ? 'bg-blue-950 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300'}`}
    >
      {children}
    </button>
  )
}

function SecaoTabela({ children, maxHeight = '220px' }) {
  const [expandido, setExpandido] = useState(false)
  const [precisaExpandir, setPrecisaExpandir] = useState(false)
  const innerRef = useRef(null)

  useEffect(() => {
    const el = innerRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      const maxH = parseInt(maxHeight.replace('px', ''))
      if (el.scrollHeight > maxH) {
        setPrecisaExpandir(true)
      } else {
        setPrecisaExpandir(false)
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [maxHeight])

  return (
    <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
      <div
        className={`transition-all duration-300 overflow-hidden ${
          expandido || !precisaExpandir ? '' : ''
        }`}
        style={{
          maxHeight: expandido || !precisaExpandir ? 'none' : maxHeight,
          ...( !expandido && precisaExpandir ? { maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' } : {} )
        }}
      >
        <div ref={innerRef}>
          {children}
        </div>
      </div>
      {!expandido && precisaExpandir && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end pb-2 pointer-events-none">
          <button
            onClick={() => setExpandido(true)}
            className="pointer-events-auto text-sm font-semibold text-blue-600 hover:text-blue-800 transition bg-white/90 backdrop-blur border border-blue-100 shadow-sm px-5 py-2 rounded-full"
          >
            Ver mais
          </button>
        </div>
      )}
      {expandido && precisaExpandir && (
        <div className="mt-4 pb-4 text-center">
          <button
            onClick={() => setExpandido(false)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition bg-blue-50 px-4 py-1.5 rounded-full"
          >
            Ver menos
          </button>
        </div>
      )}
    </div>
  )
}

function TabelaClientes({ clientes, router, mensagensNaoLidas, assumirCliente }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50/70 text-left text-[11px] text-gray-400 uppercase tracking-wider">
          <th className="px-6 py-3.5 font-semibold">Nome</th>
          <th className="px-6 py-3.5 font-semibold">Contato</th>
          <th className="px-6 py-3.5 font-semibold">Cidade</th>
          <th className="px-6 py-3.5 font-semibold">Procura</th>
          <th className="px-6 py-3.5 font-semibold">Orçamento</th>
          <th className="px-6 py-3.5 font-semibold">Plano</th>
          <th className="px-6 py-3.5 font-semibold">Responsável</th>
        </tr>
      </thead>
      <tbody>
        {clientes.map((c) => (
          <tr
            key={c.id}
            onClick={() => router.push(`/consultor/cliente/${c.id}`)}
            className="border-t border-gray-50 hover:bg-blue-50/30 transition cursor-pointer"
          >
            <td className="px-6 py-4 font-medium text-blue-950">
              <div className="flex items-center gap-2">
                {c.nome}
                {mensagensNaoLidas[c.id] > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
                    {mensagensNaoLidas[c.id]}
                  </span>
                )}
              </div>
              {c.ultimoAcesso && (
                <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                  Acessado: {new Date(c.ultimoAcesso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </td>
            <td className="px-6 py-4 text-gray-500">
              <div>{c.email}</div>
              <div className="text-xs text-gray-400">{c.telefone || '—'}</div>
            </td>
            <td className="px-6 py-4 text-gray-500">{c.cidade ? `${c.cidade}/${c.estado}` : '—'}</td>
            <td className="px-6 py-4 text-gray-500">{c.clientes_preferencias?.[0]?.categoria || '—'}</td>
            <td className="px-6 py-4 text-gray-600">
              {c.clientes_preferencias?.[0]?.preco_max
                ? Number(c.clientes_preferencias[0].preco_max).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
                : '—'}
            </td>
            <td className="px-6 py-4 text-gray-500 text-xs font-semibold">
              {c.pagamentos?.find(p => p.status === 'confirmado')?.plano || '—'}
            </td>
            <td className="px-6 py-4">
              {c.consultor_id ? (
                <span className="text-xs text-gray-500">{c.consultores?.nome || '—'}</span>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); assumirCliente(c.id) }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full transition"
                >
                  Assumir
                </button>
              )}
            </td>
          </tr>
        ))}
        {clientes.length === 0 && (
          <tr>
            <td colSpan={7} className="px-6 py-14 text-center text-gray-400 text-sm">
              Nenhum cliente encontrado.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}