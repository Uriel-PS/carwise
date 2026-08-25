'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function DesempenhoConsultor() {
  const router = useRouter()
  const [consultor, setConsultor] = useState(null)
  const [clientes, setClientes] = useState([])
  const [propostas, setPropostas] = useState([])
  const [comissoes, setComissoes] = useState([])
  const [economia, setEconomia] = useState([])
  const [ranking, setRanking] = useState([])
  const [meta, setMeta] = useState(null)
  const [carregando, setCarregando] = useState(true)

  // Metas modal state
  const [mostrarModalMeta, setMostrarModalMeta] = useState(false)
  const [novoValorMeta, setNovoValorMeta] = useState('')
  const [salvandoMeta, setSalvandoMeta] = useState(false)

  async function salvarMeta(e) {
    e.preventDefault()
    setSalvandoMeta(true)
    
    const mesAtual = new Date().getMonth() + 1
    const anoAtual = new Date().getFullYear()

    const { error } = await supabase.from('metas_consultor').upsert(
      {
        consultor_id: consultor.id,
        mes: mesAtual,
        ano: anoAtual,
        valor_meta: Number(novoValorMeta)
      },
      { onConflict: 'consultor_id, mes, ano' }
    )

    setSalvandoMeta(false)
    if (!error) {
      setMeta({ ...meta, valor_meta: Number(novoValorMeta) })
      setMostrarModalMeta(false)
    }
  }

  const carregar = useCallback(async () => {
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

    // Clients
    const { data: clientesData } = await supabase
      .from('clientes')
      .select('id, nome, etapa_atual, etapa_pipeline, created_at, consultor_id')
      .eq('consultor_id', consultorData.id)

    setClientes(clientesData || [])

    // Proposals
    const clienteIds = (clientesData || []).map(c => c.id)
    if (clienteIds.length > 0) {
      const { data: propostasData } = await supabase
        .from('propostas')
        .select('*, veiculos ( preco, preco_negociacao )')
        .in('cliente_id', clienteIds)

      setPropostas(propostasData || [])
    }

    // Commissions
    try {
      const { data: comissoesData } = await supabase
        .from('comissoes')
        .select('*')
        .eq('consultor_id', consultorData.id)
      setComissoes(comissoesData || [])
    } catch {}

    // Economy generated
    try {
      const { data: economiaData } = await supabase
        .from('economia_gerada')
        .select('*')
        .eq('consultor_id', consultorData.id)
      setEconomia(economiaData || [])
    } catch {}

    // Meta
    try {
      const { data: metaData } = await supabase
        .from('metas_consultor')
        .select('*')
        .eq('consultor_id', consultorData.id)
        .eq('mes', new Date().getMonth() + 1)
        .eq('ano', new Date().getFullYear())
        .maybeSingle()
      setMeta(metaData)
    } catch {}

    // Ranking (all consultants)
    try {
      const { data: todosConsultores } = await supabase
        .from('consultores')
        .select('id, nome')
        .eq('ativo', true)

      if (todosConsultores) {
        const rankingData = await Promise.all(
          todosConsultores.map(async (c) => {
            try {
              const { data: comData } = await supabase
                .from('comissoes')
                .select('valor')
                .eq('consultor_id', c.id)
                .neq('status', 'cancelada')

              const total = (comData || []).reduce((s, item) => s + Number(item.valor || 0), 0)
              return { ...c, total }
            } catch {
              return { ...c, total: 0 }
            }
          })
        )
        setRanking(rankingData.sort((a, b) => b.total - a.total))
      }
    } catch {}

    setCarregando(false)
  }, [router])

  useEffect(() => {
    carregar()
  }, [carregar])

  if (carregando) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-lg w-48" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  // KPI Calculations
  const totalClientes = clientes.length
  const vendasConcluidas = clientes.filter(c => {
    const etapa = c.etapa_pipeline || c.etapa_atual
    return etapa === 'compra_concluida' || etapa === 'pos_venda' || etapa === 'entrega'
  }).length
  const vendasPerdidas = clientes.filter(c => {
    const etapa = c.etapa_pipeline || c.etapa_atual
    return etapa === 'cancelado' || etapa === 'perdido'
  }).length
  const taxaConversao = totalClientes > 0 ? Math.round((vendasConcluidas / totalClientes) * 100) : 0

  // Financial
  const comissaoPrevista = comissoes.filter(c => c.status === 'prevista' || c.status === 'pendente').reduce((s, c) => s + Number(c.valor || 0), 0)
  const comissaoAprovada = comissoes.filter(c => c.status === 'aprovada').reduce((s, c) => s + Number(c.valor || 0), 0)
  const comissaoPaga = comissoes.filter(c => c.status === 'paga').reduce((s, c) => s + Number(c.valor || 0), 0)
  const comissaoPerdida = comissoes.filter(c => c.status === 'cancelada').reduce((s, c) => s + Number(c.valor || 0), 0)
  const receitaGerada = comissoes.filter(c => c.status !== 'cancelada').reduce((s, c) => s + Number(c.valor_venda || 0), 0)

  // Proposals
  const propostasAceitas = propostas.filter(p => p.status === 'aceita').length
  const propostasPendentes = propostas.filter(p => p.status === 'pendente').length
  const taxaFechamento = propostas.length > 0 ? Math.round((propostasAceitas / propostas.length) * 100) : 0

  // Vehicle values (only from truly completed sales)
  const valoresVeiculos = propostas.filter(p => {
    if (p.status !== 'aceita') return false
    return true
  }).map(p => {
    const precoBase = p.origem === 'estoque' ? p.veiculos?.preco : p.preco_externa
    const preco = p.preco_negociado || precoBase
    return Number(preco) || 0
  }).filter(v => v > 0)
  const valorMedioVeiculo = valoresVeiculos.length > 0
    ? valoresVeiculos.reduce((a, b) => a + b, 0) / valoresVeiculos.length
    : 0

  // Economy (calculated from accepted proposals, excluding cancelled commissions and reverted sales)
  const clientesConcluidosIds = new Set(
    clientes.filter(c => {
      const etapa = c.etapa_pipeline || c.etapa_atual
      return etapa === 'compra_concluida' || etapa === 'pos_venda' || etapa === 'entrega'
    }).map(c => c.id)
  )

  const comissoesCanceladasPropostaIds = new Set(
    comissoes.filter(c => c.status === 'cancelada').map(c => c.proposta_id).filter(Boolean)
  )

  const propostasComDesconto = propostas.filter(p => {
    if (p.status !== 'aceita') return false
    // Exclude if the commission for this proposal was cancelled
    if (comissoesCanceladasPropostaIds.has(p.id)) return false
    // Exclude if the client is no longer in a completed stage (sale was reverted)
    if (!clientesConcluidosIds.has(p.cliente_id)) return false
    const precoAnunciado = p.origem === 'estoque' ? p.veiculos?.preco : p.preco_externa
    return precoAnunciado && p.preco_negociado && Number(precoAnunciado) > Number(p.preco_negociado)
  })

  const economiaTotal = propostasComDesconto.reduce((s, p) => {
    const precoAnunciado = p.origem === 'estoque' ? p.veiculos?.preco : p.preco_externa
    return s + (Number(precoAnunciado) - Number(p.preco_negociado))
  }, 0)

  const descontoMedio = propostasComDesconto.length > 0
    ? propostasComDesconto.reduce((s, p) => {
        const anunciado = Number(p.origem === 'estoque' ? p.veiculos?.preco : p.preco_externa)
        const negociado = Number(p.preco_negociado)
        return s + ((anunciado - negociado) / anunciado * 100)
      }, 0) / propostasComDesconto.length
    : 0

  // Meta
  const valorMeta = meta?.valor_meta || 10000
  const mesAtual = new Date().getMonth()
  const comissoesMes = comissoes
    .filter(c => c.status !== 'cancelada' && new Date(c.created_at).getMonth() === mesAtual && new Date(c.created_at).getFullYear() === new Date().getFullYear())
    .reduce((s, c) => s + Number(c.valor || 0), 0)
  const progresso = Math.min(100, Math.round((comissoesMes / valorMeta) * 100))

  // Clients waiting response
  const aguardandoResposta = clientes.filter(c => {
    const etapa = c.etapa_pipeline || c.etapa_atual
    return ['proposta', 'documentacao', 'negociando'].includes(etapa)
  }).length

  const fmtMoeda = (v) => {
    if (!v && v !== 0) return 'R$ 0'
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1100px] mx-auto">
      <div className="mb-8">
        <h1 className="font-bold text-2xl text-slate-900">Desempenho</h1>
        <p className="text-slate-400 text-sm mt-0.5">Seus indicadores de performance</p>
      </div>

      {/* Meta */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 mb-8 text-white relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-3">
              Meta de {MESES[mesAtual]}
              <button onClick={() => { setNovoValorMeta(valorMeta); setMostrarModalMeta(true); }} className="text-[10px] bg-slate-700/50 hover:bg-slate-700 px-2.5 py-1 rounded-full font-semibold transition">Editar meta</button>
            </h2>
            <p className="text-slate-400 text-sm mt-1">{fmtMoeda(comissoesMes)} / {fmtMoeda(valorMeta)}</p>
          </div>
          <span className="text-3xl font-bold">{progresso}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-1000"
            style={{ width: `${progresso}%` }}
          />
        </div>
        {progresso < 100 && (
          <p className="text-xs text-slate-400 mt-2">Faltam {fmtMoeda(Math.max(0, valorMeta - comissoesMes))}</p>
        )}

        {/* Modal Meta */}
        {mostrarModalMeta && (
          <div className="absolute top-0 right-0 mt-4 mr-4 bg-white rounded-xl shadow-xl p-4 w-64 text-slate-800 z-10 border border-slate-100">
            <h3 className="font-bold text-sm mb-3">Definir Meta</h3>
            <form onSubmit={salvarMeta}>
              <input
                type="number"
                required
                value={novoValorMeta}
                onChange={(e) => setNovoValorMeta(e.target.value)}
                placeholder="Ex: 10000"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setMostrarModalMeta(false)} className="text-xs text-slate-500 px-3 py-1.5 hover:bg-slate-50 rounded-lg">Cancelar</button>
                <button type="submit" disabled={salvandoMeta} className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {salvandoMeta ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Ranking */}
      {ranking.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6 mb-8">
          <h2 className="font-bold text-slate-900 text-base mb-4">🏆 Ranking de Consultores</h2>
          <div className="space-y-2">
            {ranking.map((r, i) => {
              const isYou = r.id === consultor?.id
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition ${
                    isYou ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i === 0 ? 'bg-amber-400 text-white' :
                    i === 1 ? 'bg-slate-300 text-white' :
                    i === 2 ? 'bg-amber-600 text-white' :
                    'bg-slate-200 text-slate-500'
                  }`}>
                    {i + 1}
                  </span>
                  <span className={`text-sm font-semibold flex-1 ${isYou ? 'text-blue-700' : 'text-slate-700'}`}>
                    {r.nome} {isYou && '(Você)'}
                  </span>
                  <span className="text-sm font-bold text-slate-800">{fmtMoeda(r.total)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Indicator sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <span className="text-lg">📊</span> Vendas
          </h3>
          <div className="space-y-3">
            <IndicadorRow label="Consultorias recebidas" valor={totalClientes} />
            <IndicadorRow label="Vendas realizadas" valor={vendasConcluidas} destaque="green" />
            <IndicadorRow label="Vendas perdidas" valor={vendasPerdidas} destaque="red" />
            <IndicadorRow label="Taxa de conversão" valor={`${taxaConversao}%`} destaque={taxaConversao >= 50 ? 'green' : 'amber'} />
            <IndicadorRow label="Propostas pendentes" valor={propostasPendentes} />
            <IndicadorRow label="Taxa de fechamento" valor={`${taxaFechamento}%`} destaque={taxaFechamento >= 50 ? 'green' : 'amber'} />
          </div>
        </div>

        {/* Atendimento */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <span className="text-lg">👥</span> Atendimento
          </h3>
          <div className="space-y-3">
            <IndicadorRow label="Clientes ativos" valor={totalClientes - vendasConcluidas} />
            <IndicadorRow label="Aguardando resposta" valor={aguardandoResposta} destaque={aguardandoResposta > 5 ? 'amber' : null} />
            <IndicadorRow label="Negociações em aberto" valor={propostas.filter(p => p.status === 'pendente').length} />
          </div>
        </div>

        {/* Comercial */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <span className="text-lg">🚗</span> Comercial
          </h3>
          <div className="space-y-3">
            <IndicadorRow label="Valor médio dos veículos" valor={fmtMoeda(valorMedioVeiculo)} />
            <IndicadorRow label="Desconto médio conseguido" valor={`${descontoMedio.toFixed(1)}%`} />
            <IndicadorRow label="Economia gerada para clientes" valor={fmtMoeda(economiaTotal)} destaque="green" />
            <IndicadorRow label="Total de negociações" valor={propostas.length} />
          </div>
        </div>

        {/* Financeiro */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <span className="text-lg">💰</span> Financeiro
          </h3>
          <div className="space-y-3">
            <IndicadorRow label="Comissão prevista" valor={fmtMoeda(comissaoPrevista)} />
            <IndicadorRow label="Comissão aprovada" valor={fmtMoeda(comissaoAprovada)} destaque="blue" />
            <IndicadorRow label="Comissão paga" valor={fmtMoeda(comissaoPaga)} destaque="green" />
            <IndicadorRow label="Comissão perdida" valor={fmtMoeda(comissaoPerdida)} destaque="red" />
            <IndicadorRow label="Receita gerada" valor={fmtMoeda(receitaGerada)} />
          </div>
        </div>
      </div>

      {/* Economy generated highlight */}
      <div className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/70 p-6 text-center">
        <p className="text-3xl mb-2">💰</p>
        <p className="text-lg font-bold text-emerald-800">Economia gerada para seus clientes</p>
        <p className="text-3xl font-bold text-emerald-700 mt-2">{fmtMoeda(economiaTotal)}</p>
        <p className="text-sm text-emerald-600 mt-2">
          Você ajudou seus clientes a economizar este valor em negociações este mês.
        </p>
      </div>
    </div>
  )
}

function IndicadorRow({ label, valor, destaque }) {
  const destaqueClasses = {
    green: 'text-emerald-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-bold ${destaque ? destaqueClasses[destaque] : 'text-slate-800'}`}>
        {valor}
      </span>
    </div>
  )
}
