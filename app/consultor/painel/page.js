'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const ETAPAS_PIPELINE = [
  { key: 'novos', label: 'Novos', cor: 'emerald' },
  { key: 'entrevista', label: 'Entrevista', cor: 'cyan' },
  { key: 'perfil_definido', label: 'Perfil definido', cor: 'blue' },
  { key: 'buscando', label: 'Buscando veículos', cor: 'indigo' },
  { key: 'veiculos_selecionados', label: 'Selecionados', cor: 'violet' },
  { key: 'negociando', label: 'Negociação', cor: 'amber' },
  { key: 'vistoria', label: 'Vistoria', cor: 'orange' },
  { key: 'test_drive', label: 'Test drive', cor: 'pink' },
  { key: 'proposta', label: 'Proposta', cor: 'rose' },
  { key: 'documentacao', label: 'Documentação', cor: 'purple' },
  { key: 'compra_concluida', label: 'Concluída', cor: 'green' },
  { key: 'pos_venda', label: 'Pós-venda', cor: 'teal' },
]

export default function DashboardConsultor() {
  const router = useRouter()
  const [consultor, setConsultor] = useState(null)
  const [clientes, setClientes] = useState([])
  const [propostas, setPropostas] = useState([])
  const [agendamentosHoje, setAgendamentosHoje] = useState([])
  const [comissoes, setComissoes] = useState({ prevista: 0, aprovada: 0, paga: 0 })
  const [comissoesMes, setComissoesMes] = useState(0)
  const [tarefasPendentes, setTarefasPendentes] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
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

      // Load clients assigned to this consultant
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, etapa_atual, etapa_pipeline, proxima_acao, proxima_acao_prazo, created_at, consultor_id')
        .eq('consultor_id', consultorData.id)
        .order('created_at', { ascending: false })

      setClientes(clientesData || [])

      // Load proposals for these clients
      const clienteIds = (clientesData || []).map(c => c.id)
      if (clienteIds.length > 0) {
        const { data: propostasData } = await supabase
          .from('propostas')
          .select('*, veiculos ( preco )')
          .in('cliente_id', clienteIds)
        setPropostas(propostasData || [])
      }

      // Load today's appointments
      const hoje = new Date()
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
      const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1).toISOString()

      const { data: agendamentosData } = await supabase
        .from('agendamentos')
        .select('*, clientes!inner ( id, nome, consultor_id ), propostas ( veiculos ( marca, modelo ), marca_externa, modelo_externa )')
        .eq('clientes.consultor_id', consultorData.id)
        .gte('data_hora', inicioHoje)
        .lt('data_hora', fimHoje)
        .order('data_hora', { ascending: true })

      setAgendamentosHoje(agendamentosData || [])

      // Load commissions (table may not exist yet)
      try {
        const { data: comissoesData } = await supabase
          .from('comissoes')
          .select('valor, status, created_at')
          .eq('consultor_id', consultorData.id)

        if (comissoesData) {
          const prevista = comissoesData.filter(c => c.status === 'prevista' || c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0)
          const aprovada = comissoesData.filter(c => c.status === 'aprovada').reduce((s, c) => s + Number(c.valor), 0)
          const paga = comissoesData.filter(c => c.status === 'paga').reduce((s, c) => s + Number(c.valor), 0)
          setComissoes({ prevista, aprovada, paga })

          const mesAtual = new Date().getMonth()
          const anoAtual = new Date().getFullYear()
          const doMes = comissoesData.filter(c => {
            const d = new Date(c.created_at)
            return c.status !== 'cancelada' && d.getMonth() === mesAtual && d.getFullYear() === anoAtual
          })
          setComissoesMes(doMes.reduce((s, c) => s + Number(c.valor), 0))
        }
      } catch {
        // Table doesn't exist yet
      }

      // Load pending tasks
      try {
        const { data: tarefasData } = await supabase
          .from('tarefas_consultor')
          .select('*, clientes ( nome )')
          .eq('consultor_id', consultorData.id)
          .in('status', ['pendente', 'em_andamento'])
          .order('prazo', { ascending: true })
          .limit(5)

        setTarefasPendentes(tarefasData || [])
      } catch {
        // Table doesn't exist yet
      }

      setCarregando(false)
    }

    carregar()
  }, [router])

  if (carregando) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded-lg w-72" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Calculate KPIs
  const totalClientes = clientes.length
  const emAndamento = clientes.filter(c => {
    const etapa = c.etapa_pipeline || c.etapa_atual || 'novos'
    return !['compra_concluida', 'pos_venda'].includes(etapa)
  }).length
  const aguardandoCliente = clientes.filter(c => {
    const etapa = c.etapa_pipeline || c.etapa_atual
    return ['proposta', 'documentacao'].includes(etapa)
  }).length
  const agendadasHoje = agendamentosHoje.length
  const vendasConcluidas = clientes.filter(c => {
    const etapa = c.etapa_pipeline || c.etapa_atual
    return etapa === 'compra_concluida' || etapa === 'pos_venda'
  }).length
  const totalComissao = comissoes.prevista + comissoes.aprovada + comissoes.paga
  const taxaConversao = totalClientes > 0
    ? Math.round((vendasConcluidas / totalClientes) * 100)
    : 0

  // Clients needing attention (have proxima_acao or are overdue)
  const clientesAtencao = clientes
    .filter(c => c.proxima_acao || c.proxima_acao_prazo)
    .sort((a, b) => {
      if (!a.proxima_acao_prazo) return 1
      if (!b.proxima_acao_prazo) return -1
      return new Date(a.proxima_acao_prazo) - new Date(b.proxima_acao_prazo)
    })
    .slice(0, 5)

  // Pipeline distribution
  const pipelineCounts = {}
  ETAPAS_PIPELINE.forEach(e => { pipelineCounts[e.key] = 0 })
  clientes.forEach(c => {
    const etapa = c.etapa_pipeline || c.etapa_atual || 'novos'
    if (pipelineCounts[etapa] !== undefined) pipelineCounts[etapa]++
  })

  const fmtMoeda = (v) => {
    if (!v && v !== 0) return 'R$ 0'
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
          Olá, {consultor?.nome?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">Aqui está o resumo da sua operação.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
        <KPICard
          label="Consultorias ativas"
          valor={totalClientes}
          icone="🟢"
          cor="emerald"
        />
        <KPICard
          label="Em andamento"
          valor={emAndamento}
          icone="🔵"
          cor="blue"
        />
        <KPICard
          label="Aguardando cliente"
          valor={aguardandoCliente}
          icone="🟡"
          cor="amber"
        />
        <KPICard
          label="Agendadas hoje"
          valor={agendadasHoje}
          icone="🟣"
          cor="violet"
        />
        <KPICard
          label="Vendas concluídas"
          valor={vendasConcluidas}
          icone="✅"
          cor="green"
        />
        <KPICardComissao
          label="Comissão a receber"
          total={totalComissao}
          prevista={comissoes.prevista}
          aprovada={comissoes.aprovada}
          paga={comissoes.paga}
          fmtMoeda={fmtMoeda}
        />
        <KPICard
          label="Comissão este mês"
          valor={fmtMoeda(comissoesMes)}
          icone="💵"
          cor="emerald"
          grande
        />
        <KPICard
          label="Taxa de conversão"
          valor={`${taxaConversao}%`}
          icone="📈"
          cor="indigo"
          grande
        />
      </div>

      {/* Pipeline visual summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Pipeline de vendas</h2>
            <p className="text-slate-400 text-xs mt-0.5">Distribuição dos clientes por etapa</p>
          </div>
          <a
            href="/consultor/pipeline"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-lg transition"
          >
            Ver pipeline completo →
          </a>
        </div>

        <div className="flex gap-1.5 items-end h-20 mb-3">
          {ETAPAS_PIPELINE.map((etapa) => {
            const count = pipelineCounts[etapa.key] || 0
            const maxCount = Math.max(...Object.values(pipelineCounts), 1)
            const height = count > 0 ? Math.max(20, (count / maxCount) * 100) : 6

            return (
              <div key={etapa.key} className="flex-1 flex flex-col items-center gap-1 group relative">
                <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5">
                  {count}
                </span>
                <div
                  className={`w-full rounded-t-md transition-all duration-500 ease-out cursor-pointer hover:opacity-80 ${getBarColor(etapa.cor)}`}
                  style={{ height: `${height}%`, minHeight: count > 0 ? '12px' : '4px' }}
                  title={`${etapa.label}: ${count}`}
                />
              </div>
            )
          })}
        </div>
        <div className="flex gap-1.5">
          {ETAPAS_PIPELINE.map((etapa) => (
            <div key={etapa.key} className="flex-1 text-center">
              <span className="text-[9px] text-slate-400 font-medium leading-tight block truncate">
                {etapa.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Agenda do dia */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Agenda de hoje</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </p>
            </div>
            <a
              href="/consultor/agenda"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
            >
              Ver agenda →
            </a>
          </div>

          {agendamentosHoje.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📅</p>
              <p className="text-slate-400 text-sm">Nenhum agendamento para hoje.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {agendamentosHoje.map((ag) => {
                const hora = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                const veiculo = ag.propostas?.veiculos
                  ? `${ag.propostas.veiculos.marca} ${ag.propostas.veiculos.modelo}`
                  : ag.propostas?.marca_externa
                    ? `${ag.propostas.marca_externa} ${ag.propostas.modelo_externa}`
                    : null

                const tipoIcone = ag.tipo === 'test_drive' ? '🚗' : ag.tipo === 'vistoria' ? '🔧' : '📞'

                return (
                  <div key={ag.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 transition group">
                    <div className="text-sm font-mono font-semibold text-slate-500 w-12 shrink-0">{hora}</div>
                    <div className="text-lg shrink-0">{tipoIcone}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {ag.clientes?.nome}
                      </p>
                      {veiculo && <p className="text-xs text-slate-400 truncate">{veiculo}</p>}
                    </div>
                    <a
                      href={`/consultor/cliente/${ag.clientes?.id}`}
                      className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition font-medium shrink-0"
                    >
                      Ver →
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Próximas ações */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Próximas ações</h2>
              <p className="text-slate-400 text-xs mt-0.5">Clientes que precisam de atenção</p>
            </div>
            <a
              href="/consultor/tarefas"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
            >
              Ver todas →
            </a>
          </div>

          {clientesAtencao.length === 0 && tarefasPendentes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-slate-400 text-sm">Tudo em dia! Nenhuma ação pendente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clientesAtencao.map((c) => {
                const prazo = c.proxima_acao_prazo ? new Date(c.proxima_acao_prazo) : null
                const atrasado = prazo && prazo < new Date()
                const ehHoje = prazo && prazo.toDateString() === new Date().toDateString()

                return (
                  <a
                    key={c.id}
                    href={`/consultor/cliente/${c.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 transition group"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${atrasado ? 'bg-red-500' : ehHoje ? 'bg-amber-400' : 'bg-blue-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.nome}</p>
                      <p className="text-xs text-slate-400 truncate">{c.proxima_acao || 'Ação pendente'}</p>
                    </div>
                    {prazo && (
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${
                        atrasado ? 'bg-red-100 text-red-700' : ehHoje ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {ehHoje ? 'Hoje' : atrasado ? 'Atrasado' : prazo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    )}
                  </a>
                )
              })}

              {tarefasPendentes.map((t) => {
                const prazo = t.prazo ? new Date(t.prazo) : null
                const atrasado = prazo && prazo < new Date()

                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 transition"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${atrasado ? 'bg-red-500' : 'bg-blue-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{t.titulo}</p>
                      <p className="text-xs text-slate-400 truncate">{t.clientes?.nome}</p>
                    </div>
                    {t.prioridade === 'urgente' && (
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700 shrink-0">
                        Urgente
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent clients quick access */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Clientes recentes</h2>
            <p className="text-slate-400 text-xs mt-0.5">{totalClientes} clientes no total</p>
          </div>
          <a
            href="/consultor/clientes"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-lg transition"
          >
            Ver todos →
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Cliente</th>
                <th className="pb-3 font-semibold">Etapa</th>
                <th className="pb-3 font-semibold">Próxima ação</th>
                <th className="pb-3 font-semibold">Prazo</th>
              </tr>
            </thead>
            <tbody>
              {clientes.slice(0, 6).map((c) => {
                const etapa = ETAPAS_PIPELINE.find(e => e.key === (c.etapa_pipeline || c.etapa_atual || 'novos'))
                const prazo = c.proxima_acao_prazo ? new Date(c.proxima_acao_prazo) : null
                const atrasado = prazo && prazo < new Date()

                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/consultor/cliente/${c.id}`)}
                    className="border-t border-slate-100 hover:bg-blue-50/30 transition cursor-pointer"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                          {c.nome?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800 truncate">{c.nome}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {etapa && (
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${getEtapaBadge(etapa.cor)}`}>
                          {etapa.label}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-500 text-xs truncate max-w-[200px]">
                      {c.proxima_acao || '—'}
                    </td>
                    <td className="py-3">
                      {prazo ? (
                        <span className={`text-xs font-medium ${atrasado ? 'text-red-600' : 'text-slate-400'}`}>
                          {prazo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// --- Sub-components ---

function KPICard({ label, valor, icone, cor, grande }) {
  return (
    <div className={`rounded-2xl p-5 border transition-shadow hover:shadow-md ${getCardStyle(cor)}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-tight">{label}</span>
        <span className="text-lg">{icone}</span>
      </div>
      <p className={`font-bold text-slate-900 ${grande ? 'text-xl' : 'text-2xl'}`}>{valor}</p>
    </div>
  )
}

function KPICardComissao({ label, total, prevista, aprovada, paga, fmtMoeda }) {
  return (
    <div className="rounded-2xl p-5 border border-slate-200/70 bg-gradient-to-br from-white to-emerald-50/30 transition-shadow hover:shadow-md col-span-2 lg:col-span-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-lg">💰</span>
      </div>
      <p className="font-bold text-slate-900 text-xl mb-3">{fmtMoeda(total)}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-slate-500">Prevista</span>
          <span className="ml-auto font-semibold text-slate-700">{fmtMoeda(prevista)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span className="text-slate-500">Aprovada</span>
          <span className="ml-auto font-semibold text-slate-700">{fmtMoeda(aprovada)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-slate-500">Paga</span>
          <span className="ml-auto font-semibold text-slate-700">{fmtMoeda(paga)}</span>
        </div>
      </div>
    </div>
  )
}

function getCardStyle(cor) {
  const map = {
    emerald: 'border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/40',
    blue: 'border-blue-200/70 bg-gradient-to-br from-white to-blue-50/40',
    amber: 'border-amber-200/70 bg-gradient-to-br from-white to-amber-50/40',
    violet: 'border-violet-200/70 bg-gradient-to-br from-white to-violet-50/40',
    green: 'border-green-200/70 bg-gradient-to-br from-white to-green-50/40',
    indigo: 'border-indigo-200/70 bg-gradient-to-br from-white to-indigo-50/40',
  }
  return map[cor] || map.blue
}

function getBarColor(cor) {
  const map = {
    emerald: 'bg-emerald-400',
    cyan: 'bg-cyan-400',
    blue: 'bg-blue-500',
    indigo: 'bg-indigo-500',
    violet: 'bg-violet-500',
    amber: 'bg-amber-400',
    orange: 'bg-orange-400',
    pink: 'bg-pink-400',
    rose: 'bg-rose-400',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    teal: 'bg-teal-400',
  }
  return map[cor] || 'bg-slate-300'
}

function getEtapaBadge(cor) {
  const map = {
    emerald: 'bg-emerald-50 text-emerald-700',
    cyan: 'bg-cyan-50 text-cyan-700',
    blue: 'bg-blue-50 text-blue-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700',
    orange: 'bg-orange-50 text-orange-700',
    pink: 'bg-pink-50 text-pink-700',
    rose: 'bg-rose-50 text-rose-700',
    purple: 'bg-purple-50 text-purple-700',
    green: 'bg-green-50 text-green-700',
    teal: 'bg-teal-50 text-teal-700',
  }
  return map[cor] || 'bg-slate-50 text-slate-600'
}