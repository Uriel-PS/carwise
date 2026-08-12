'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import ContrapropostaModal from '../../components/ContrapropostaModal'

const ETAPAS_PIPELINE = [
  { key: 'buscando', label: 'Buscando veículo', cor: 'blue', icone: '🔍' },
  { key: 'negociando', label: 'Em negociação', cor: 'amber', icone: '🤝' },
  { key: 'documentacao', label: 'Documentação', cor: 'purple', icone: '📋' },
  { key: 'entrega', label: 'Entrega', cor: 'green', icone: '🚗' },
]

const STATUS_CORES = {
  pendente: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  aceita: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-400' },
  recusada: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
}

export default function NegociacaoConsultor() {
  const router = useRouter()
  const [consultor, setConsultor] = useState(null)
  const [clientes, setClientes] = useState([])
  const [propostas, setPropostas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroEtapa, setFiltroEtapa] = useState('todos')
  const [visao, setVisao] = useState('lista') // 'lista' | 'pipeline'
  const [propostaContraproposta, setPropostaContraproposta] = useState(null)
  const [novaObs, setNovaObs] = useState({})
  const [salvandoObs, setSalvandoObs] = useState(null)

  const carregar = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      router.push('/consultor/login')
      return
    }

    const user = sessionData.session.user

    const { data: consultorData } = await supabase
      .from('consultores')
      .select('*')
      .eq('auth_id', user.id)
      .eq('ativo', true)
      .maybeSingle()

    if (!consultorData) {
      router.push('/consultor/login')
      return
    }

    setConsultor(consultorData)

    // Load all clients assigned to this consultant
    const { data: clientesData } = await supabase
      .from('clientes')
      .select('id, nome, email, telefone, cidade, estado, etapa_atual, created_at')
      .eq('consultor_id', consultorData.id)
      .order('created_at', { ascending: false })

    setClientes(clientesData || [])

    // Load all proposals for these clients
    const clienteIds = (clientesData || []).map(c => c.id)

    if (clienteIds.length > 0) {
      const { data: propostasData } = await supabase
        .from('propostas')
        .select('*, veiculos ( marca, modelo, versao, ano_fabricacao, ano_modelo, preco, preco_negociacao, concessionarias ( nome_fantasia ) )')
        .in('cliente_id', clienteIds)
        .order('created_at', { ascending: false })

      setPropostas(propostasData || [])
    }

    setCarregando(false)
  }, [router])

  useEffect(() => {
    carregar()
  }, [carregar])

  // --- KPIs ---
  const totalClientes = clientes.length
  const clientesNegociando = clientes.filter(c => c.etapa_atual === 'negociando').length
  const propostasPendentes = propostas.filter(p => p.status === 'pendente').length
  const propostasAceitas = propostas.filter(p => p.status === 'aceita').length
  const propostasRecusadas = propostas.filter(p => p.status === 'recusada').length
  const valorTotalNegociacao = propostas
    .filter(p => p.status === 'pendente')
    .reduce((acc, p) => {
      const preco = p.origem === 'estoque' ? p.veiculos?.preco : p.preco_externa
      return acc + (Number(preco) || 0)
    }, 0)

  // --- Filters ---
  const negociacoes = clientes.map(cliente => {
    const propostasCliente = propostas.filter(p => p.cliente_id === cliente.id)
    return { cliente, propostas: propostasCliente }
  })
    .filter(n => n.propostas.length > 0 || n.cliente.etapa_atual === 'negociando')
    .filter(n => {
      if (busca) {
        const q = busca.toLowerCase()
        const matchCliente = n.cliente.nome?.toLowerCase().includes(q)
        const matchVeiculo = n.propostas.some(p => {
          const nome = p.origem === 'estoque'
            ? `${p.veiculos?.marca} ${p.veiculos?.modelo}`.toLowerCase()
            : `${p.marca_externa} ${p.modelo_externa}`.toLowerCase()
          return nome.includes(q)
        })
        return matchCliente || matchVeiculo
      }
      return true
    })
    .filter(n => {
      if (filtroEtapa !== 'todos') return n.cliente.etapa_atual === filtroEtapa
      return true
    })
    .filter(n => {
      if (filtroStatus !== 'todos') return n.propostas.some(p => p.status === filtroStatus)
      return true
    })

  // Pipeline groups
  const pipeline = ETAPAS_PIPELINE.map(etapa => ({
    ...etapa,
    negociacoes: negociacoes.filter(n => n.cliente.etapa_atual === etapa.key),
  }))

  async function alterarStatusProposta(id, novoStatus) {
    await supabase.from('propostas').update({ status: novoStatus }).eq('id', id)
    carregar()
  }

  async function adicionarObservacao(clienteId) {
    const obs = novaObs[clienteId]
    if (!obs?.trim()) return
    setSalvandoObs(clienteId)

    await supabase.from('historico_negociacao').insert([{
      cliente_id: clienteId,
      autor_tipo: 'consultor',
      autor_nome: consultor?.nome || 'Consultor',
      evento: 'nota',
      observacao: obs,
    }])

    setNovaObs(prev => ({ ...prev, [clienteId]: '' }))
    setSalvandoObs(null)
  }

  function fmtMoeda(v) {
    if (!v) return '—'
    const n = Number(v)
    if (isNaN(n)) return '—'
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  }

  function tempoNaEtapa(createdAt) {
    const dias = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
    if (dias === 0) return 'hoje'
    if (dias === 1) return '1 dia'
    return `${dias} dias`
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Carregando negociações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <a href="/consultor/painel" className="flex items-center gap-2 font-extrabold text-lg text-blue-950 hover:text-blue-700 transition">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              CarWise
            </a>
            <span className="text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">Negociações</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/consultor/painel" className="text-sm text-gray-400 hover:text-blue-600 font-medium transition">
              ← Painel
            </a>
            <span className="text-sm text-gray-400 hidden sm:block">{consultor?.nome}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <KPICard label="Clientes ativos" valor={totalClientes} cor="blue" icone="👥" />
          <KPICard label="Em negociação" valor={clientesNegociando} cor="amber" icone="🤝" />
          <KPICard label="Propostas pendentes" valor={propostasPendentes} cor="yellow" icone="⏳" />
          <KPICard label="Aceitas" valor={propostasAceitas} cor="green" icone="✅" />
          <KPICard
            label="Valor em negociação"
            valor={fmtMoeda(valorTotalNegociacao)}
            cor="blue"
            icone="💰"
            grande
          />
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar cliente ou veículo..."
                  className="border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 w-64 focus:border-blue-400 focus:outline-none transition"
                />
                <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
              </div>

              {/* Status filter */}
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:border-blue-400 focus:outline-none transition"
              >
                <option value="todos">Todos os status</option>
                <option value="pendente">Pendentes</option>
                <option value="aceita">Aceitas</option>
                <option value="recusada">Recusadas</option>
              </select>

              {/* Stage filter */}
              <select
                value={filtroEtapa}
                onChange={(e) => setFiltroEtapa(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:border-blue-400 focus:outline-none transition"
              >
                <option value="todos">Todas as etapas</option>
                {ETAPAS_PIPELINE.map(e => (
                  <option key={e.key} value={e.key}>{e.label}</option>
                ))}
              </select>
            </div>

            {/* View toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setVisao('lista')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
                  visao === 'lista' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Lista
              </button>
              <button
                onClick={() => setVisao('pipeline')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
                  visao === 'pipeline' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pipeline
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {visao === 'pipeline' ? (
          /* Pipeline Kanban View */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {pipeline.map(etapa => (
              <div key={etapa.key} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className={`px-5 py-3 border-b border-gray-100 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{etapa.icone}</span>
                    <h3 className="font-semibold text-sm text-gray-800">{etapa.label}</h3>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-${etapa.cor}-100 text-${etapa.cor}-700`}>
                    {etapa.negociacoes.length}
                  </span>
                </div>
                <div className="p-3 space-y-2 max-h-[65vh] overflow-y-auto">
                  {etapa.negociacoes.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Nenhum cliente nesta etapa</p>
                  ) : (
                    etapa.negociacoes.map(neg => (
                      <PipelineCard
                        key={neg.cliente.id}
                        neg={neg}
                        fmtMoeda={fmtMoeda}
                        onVerCliente={() => router.push(`/consultor/cliente/${neg.cliente.id}`)}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {negociacoes.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-gray-500 font-medium">Nenhuma negociação encontrada</p>
                <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros ou assuma novos clientes no painel.</p>
              </div>
            ) : (
              negociacoes.map(neg => (
                <NegociacaoCard
                  key={neg.cliente.id}
                  neg={neg}
                  fmtMoeda={fmtMoeda}
                  tempoNaEtapa={tempoNaEtapa}
                  onVerCliente={() => router.push(`/consultor/cliente/${neg.cliente.id}`)}
                  onAlterarStatus={alterarStatusProposta}
                  onContraproposta={(p) => setPropostaContraproposta(p)}
                  novaObs={novaObs[neg.cliente.id] || ''}
                  onChangeObs={(val) => setNovaObs(prev => ({ ...prev, [neg.cliente.id]: val }))}
                  onSalvarObs={() => adicionarObservacao(neg.cliente.id)}
                  salvandoObs={salvandoObs === neg.cliente.id}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal de Contraproposta */}
      {propostaContraproposta && (
        <ContrapropostaModal
          proposta={propostaContraproposta}
          onClose={() => setPropostaContraproposta(null)}
          onSalvo={carregar}
        />
      )}
    </div>
  )
}

// --- Sub-components ---

function KPICard({ label, valor, cor, icone, grande }) {
  const corMap = {
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
    yellow: 'from-yellow-500 to-yellow-600',
    green: 'from-green-500 to-green-600',
  }
  return (
    <div className={`rounded-2xl p-5 text-white bg-gradient-to-br ${corMap[cor] || corMap.blue} shadow-sm ${grande ? 'col-span-2 md:col-span-1' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-xl">{icone}</span>
      </div>
      <p className={`font-bold ${grande ? 'text-xl' : 'text-2xl'}`}>{valor}</p>
    </div>
  )
}

function PipelineCard({ neg, fmtMoeda, onVerCliente }) {
  const propostaPrincipal = neg.propostas[0]
  const preco = propostaPrincipal
    ? propostaPrincipal.origem === 'estoque'
      ? propostaPrincipal.veiculos?.preco
      : propostaPrincipal.preco_externa
    : null

  return (
    <button
      onClick={onVerCliente}
      className="w-full text-left bg-gray-50 hover:bg-blue-50 rounded-xl p-3.5 transition border border-transparent hover:border-blue-200"
    >
      <p className="font-semibold text-sm text-gray-900 truncate">{neg.cliente.nome}</p>
      {propostaPrincipal && (
        <>
          <p className="text-xs text-gray-500 mt-1 truncate">
            {propostaPrincipal.origem === 'estoque'
              ? `${propostaPrincipal.veiculos?.marca} ${propostaPrincipal.veiculos?.modelo}`
              : `${propostaPrincipal.marca_externa} ${propostaPrincipal.modelo_externa}`}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-semibold text-gray-700">{fmtMoeda(preco)}</span>
            <StatusBadge status={propostaPrincipal.status} />
          </div>
        </>
      )}
      {neg.propostas.length > 1 && (
        <p className="text-[10px] text-gray-400 mt-1.5">+ {neg.propostas.length - 1} outra(s) proposta(s)</p>
      )}
    </button>
  )
}

function NegociacaoCard({
  neg, fmtMoeda, tempoNaEtapa, onVerCliente, onAlterarStatus,
  onContraproposta, novaObs, onChangeObs, onSalvarObs, salvandoObs
}) {
  const [expandido, setExpandido] = useState(false)

  const etapaInfo = ETAPAS_PIPELINE.find(e => e.key === neg.cliente.etapa_atual)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Card header */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg shrink-0">
              {neg.cliente.nome?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-blue-950">{neg.cliente.nome}</h3>
              <div className="flex items-center gap-3 mt-1">
                {etapaInfo && (
                  <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    {etapaInfo.icone} {etapaInfo.label}
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  Cliente há {tempoNaEtapa(neg.cliente.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
              {neg.propostas.length} proposta{neg.propostas.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={onVerCliente}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition"
            >
              Ver perfil completo →
            </button>
            <button
              onClick={() => setExpandido(!expandido)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full transition"
            >
              {expandido ? 'Recolher' : 'Expandir'}
            </button>
          </div>
        </div>

        {/* Proposals summary - always visible */}
        <div className="mt-5 space-y-2">
          {neg.propostas.slice(0, expandido ? undefined : 2).map(p => {
            const dados = p.origem === 'estoque'
              ? { nome: `${p.veiculos?.marca} ${p.veiculos?.modelo} ${p.veiculos?.versao || ''}`.trim(), preco: p.veiculos?.preco, fonte: p.veiculos?.concessionarias?.nome_fantasia, precoNeg: p.veiculos?.preco_negociacao }
              : { nome: `${p.marca_externa} ${p.modelo_externa}`.trim(), preco: p.preco_externa, fonte: 'Externo', precoNeg: null }

            return (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-gray-100 rounded-xl p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{dados.nome}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-semibold text-gray-700">{fmtMoeda(dados.preco)}</span>
                    {dados.precoNeg && (
                      <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        mín. {fmtMoeda(dados.precoNeg)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">· {dados.fonte}</span>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {p.status === 'pendente' && (
                    <>
                      <button
                        onClick={() => onAlterarStatus(p.id, 'aceita')}
                        className="text-[11px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition"
                      >
                        ✓ Aceitar
                      </button>
                      <button
                        onClick={() => onAlterarStatus(p.id, 'recusada')}
                        className="text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition"
                      >
                        ✗ Recusar
                      </button>
                    </>
                  )}
                  {p.status !== 'pendente' && (
                    <button
                      onClick={() => onAlterarStatus(p.id, 'pendente')}
                      className="text-[11px] font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition"
                    >
                      ↩ Reabrir
                    </button>
                  )}
                  <button
                    onClick={() => onContraproposta(p)}
                    className="text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition"
                  >
                    💰 Contraproposta
                  </button>
                </div>
              </div>
            )
          })}
          {!expandido && neg.propostas.length > 2 && (
            <button
              onClick={() => setExpandido(true)}
              className="text-xs text-gray-400 hover:text-blue-600 font-medium w-full text-center py-2 transition"
            >
              + {neg.propostas.length - 2} mais proposta(s)
            </button>
          )}
        </div>
      </div>

      {/* Expanded: Quick observation */}
      {expandido && (
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Adicionar observação rápida</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={novaObs}
              onChange={(e) => onChangeObs(e.target.value)}
              placeholder="Ex: Cliente pediu desconto de 5%..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none transition"
              onKeyDown={(e) => e.key === 'Enter' && onSalvarObs()}
            />
            <button
              onClick={onSalvarObs}
              disabled={salvandoObs || !novaObs?.trim()}
              className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 shrink-0"
            >
              {salvandoObs ? '...' : 'Registrar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const cores = STATUS_CORES[status] || STATUS_CORES.pendente
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cores.bg} ${cores.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cores.dot}`} />
      {status}
    </span>
  )
}
