'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function ClientesConsultor() {
  const router = useRouter()
  const [consultor, setConsultor] = useState(null)
  const [clientes, setClientes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroResponsavel, setFiltroResponsavel] = useState('meus')
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState({})

  async function carregarTudo() {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) { router.push('/consultor/login'); return }

    const user = sessionData.session.user

    const { data: consultorData } = await supabase
      .from('consultores')
      .select('*')
      .eq('auth_id', user.id)
      .eq('ativo', true)
      .maybeSingle()

    if (!consultorData) { router.push('/consultor/login'); return }
    setConsultor(consultorData)

    const { data: clientesData, error: clientesError } = await supabase
      .from('clientes')
      .select(`
        id, nome, email, telefone, cidade, estado, created_at, consultor_id, etapa_atual, etapa_pipeline, proxima_acao, proxima_acao_prazo,
        clientes_financeiro ( forma_pagamento ),
        clientes_preferencias ( categoria, preco_max ),
        consultores ( nome ),
        pagamentos ( plano, status )
      `)
      .order('created_at', { ascending: false })

    // Unread messages count per client
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

    setCarregando(false)
  }

  useEffect(() => {
    carregarTudo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

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

  const ETAPAS_LABELS = {
    novos: 'Novo',
    entrevista: 'Entrevista',
    perfil_definido: 'Perfil definido',
    buscando: 'Buscando',
    veiculos_selecionados: 'Selecionados',
    negociando: 'Negociação',
    vistoria: 'Vistoria',
    test_drive: 'Test drive',
    proposta: 'Proposta',
    documentacao: 'Documentação',
    compra_concluida: 'Concluída',
    pos_venda: 'Pós-venda',
    cadastro: 'Cadastro',
    entrega: 'Entrega',
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

  // Inject recent access timestamps
  let recentItems = []
  try {
    recentItems = JSON.parse(localStorage.getItem('recent_clients_consultor') || '[]')
  } catch (e) {}

  const recentMap = {}
  recentItems.forEach((item, index) => {
    const id = typeof item === 'object' ? item.id : item
    const ts = typeof item === 'object' ? item.timestamp : null
    recentMap[String(id)] = { index, timestamp: ts }
  })

  const clientesSorted = [...clientesFiltrados].map(c => ({
    ...c,
    ultimoAcesso: recentMap[String(c.id)]?.timestamp
  })).sort((a, b) => {
    const itemA = recentMap[String(a.id)]
    const itemB = recentMap[String(b.id)]
    if (itemA && itemB) return itemA.index - itemB.index
    if (itemA) return -1
    if (itemB) return 1
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const clientesComPlano = clientesSorted.filter(c => c.pagamentos?.some(p => p.status === 'confirmado'))
  const clientesSemPlano = clientesSorted.filter(c => !c.pagamentos?.some(p => p.status === 'confirmado'))

  if (carregando) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-lg w-64" />
          <div className="h-64 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="font-bold text-2xl text-slate-900">Meus Clientes</h1>
          <p className="text-slate-400 text-sm mt-0.5">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} no total</p>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou cidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm w-80 text-slate-900 placeholder-slate-400 bg-white focus:border-blue-400 focus:outline-none transition"
          />
        </div>
      </div>

      {erro && (
        <p className="text-red-600 text-sm mb-5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{erro}</p>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <ChipFiltro ativo={filtroResponsavel === 'meus'} onClick={() => setFiltroResponsavel('meus')}>Meus clientes</ChipFiltro>
        <ChipFiltro ativo={filtroResponsavel === 'todos'} onClick={() => setFiltroResponsavel('todos')}>Todos</ChipFiltro>
        <ChipFiltro ativo={filtroResponsavel === 'sem-consultor'} onClick={() => setFiltroResponsavel('sem-consultor')}>Sem consultor</ChipFiltro>
      </div>

      {/* Clients with plan */}
      <h2 className="text-sm font-bold text-slate-700 mb-2 px-1">Clientes com Plano Ativo</h2>
      <SecaoTabela maxHeight="600px">
        <TabelaClientes
          clientes={clientesComPlano}
          router={router}
          mensagensNaoLidas={mensagensNaoLidas}
          assumirCliente={assumirCliente}
          etapasLabels={ETAPAS_LABELS}
        />
      </SecaoTabela>

      {/* Clients without plan */}
      <h2 className="text-sm font-bold text-slate-700 mb-2 px-1 mt-8">Demais Clientes (Sem Plano)</h2>
      <SecaoTabela maxHeight="220px">
        <TabelaClientes
          clientes={clientesSemPlano}
          router={router}
          mensagensNaoLidas={mensagensNaoLidas}
          assumirCliente={assumirCliente}
          etapasLabels={ETAPAS_LABELS}
        />
      </SecaoTabela>
    </div>
  )
}

function ChipFiltro({ ativo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition ${ativo ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'}`}
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
    <div className="relative bg-white rounded-2xl shadow-sm border border-slate-200/70 mb-6">
      <div
        className="transition-all duration-300 overflow-hidden"
        style={{
          maxHeight: expandido || !precisaExpandir ? 'none' : maxHeight,
          ...(!expandido && precisaExpandir ? { maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' } : {})
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

function TabelaClientes({ clientes, router, mensagensNaoLidas, assumirCliente, etapasLabels }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50/70 text-left text-[11px] text-slate-400 uppercase tracking-wider">
          <th className="px-6 py-3.5 font-semibold">Nome</th>
          <th className="px-6 py-3.5 font-semibold">Contato</th>
          <th className="px-6 py-3.5 font-semibold">Cidade</th>
          <th className="px-6 py-3.5 font-semibold">Etapa</th>
          <th className="px-6 py-3.5 font-semibold">Procura</th>
          <th className="px-6 py-3.5 font-semibold">Orçamento</th>
          <th className="px-6 py-3.5 font-semibold">Plano</th>
          <th className="px-6 py-3.5 font-semibold">Responsável</th>
        </tr>
      </thead>
      <tbody>
        {clientes.map((c) => {
          const etapa = c.etapa_pipeline || c.etapa_atual || 'novos'
          return (
            <tr
              key={c.id}
              onClick={() => router.push(`/consultor/cliente/${c.id}`)}
              className="border-t border-slate-50 hover:bg-blue-50/30 transition cursor-pointer"
            >
              <td className="px-6 py-4 font-medium text-slate-800">
                <div className="flex items-center gap-2">
                  {c.nome}
                  {mensagensNaoLidas[c.id] > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
                      {mensagensNaoLidas[c.id]}
                    </span>
                  )}
                </div>
                {c.ultimoAcesso && (
                  <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                    Acessado: {new Date(c.ultimoAcesso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-slate-500">
                <div>{c.email}</div>
                <div className="text-xs text-slate-400">{c.telefone || '—'}</div>
              </td>
              <td className="px-6 py-4 text-slate-500">{c.cidade ? `${c.cidade}/${c.estado}` : '—'}</td>
              <td className="px-6 py-4">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  {etapasLabels[etapa] || etapa}
                </span>
              </td>
              <td className="px-6 py-4 text-slate-500">{c.clientes_preferencias?.[0]?.categoria || '—'}</td>
              <td className="px-6 py-4 text-slate-600">
                {c.clientes_preferencias?.[0]?.preco_max
                  ? Number(c.clientes_preferencias[0].preco_max).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
                  : '—'}
              </td>
              <td className="px-6 py-4 text-slate-500 text-xs font-semibold">
                {c.pagamentos?.find(p => p.status === 'confirmado')?.plano || '—'}
              </td>
              <td className="px-6 py-4">
                {c.consultor_id ? (
                  <span className="text-xs text-slate-500">{c.consultores?.nome || '—'}</span>
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
          )
        })}
        {clientes.length === 0 && (
          <tr>
            <td colSpan={8} className="px-6 py-14 text-center text-slate-400 text-sm">
              Nenhum cliente encontrado.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
