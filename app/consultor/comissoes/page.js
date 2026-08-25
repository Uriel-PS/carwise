'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const STATUS_COR = {
  prevista: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
  pendente: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  aprovada: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  paga: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  cancelada: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function ComissoesConsultor() {
  const router = useRouter()
  const [consultor, setConsultor] = useState(null)
  const [comissoes, setComissoes] = useState([])
  const [meta, setMeta] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [tabelaExiste, setTabelaExiste] = useState(true)

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

    // Load commissions
    try {
      const { data: comissoesData, error } = await supabase
        .from('comissoes')
        .select('*, clientes ( nome )')
        .eq('consultor_id', consultorData.id)
        .order('created_at', { ascending: false })

      if (error) {
        setTabelaExiste(false)
      } else {
        setComissoes(comissoesData || [])
      }
    } catch {
      setTabelaExiste(false)
    }

    // Load monthly goal
    try {
      const mesAtual = new Date().getMonth() + 1
      const anoAtual = new Date().getFullYear()

      const { data: metaData } = await supabase
        .from('metas_consultor')
        .select('*')
        .eq('consultor_id', consultorData.id)
        .eq('mes', mesAtual)
        .eq('ano', anoAtual)
        .maybeSingle()

      setMeta(metaData)
    } catch {
      // Table doesn't exist
    }

    setCarregando(false)
  }, [router])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Calculate totals
  const mesAtual = new Date().getMonth()
  const anoAtual = new Date().getFullYear()

  const comissoesAtivas = comissoes.filter(c => c.status !== 'cancelada')

  const comissoesMes = comissoesAtivas.filter(c => {
    const d = new Date(c.created_at)
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual
  })

  const totalGeral = comissoesAtivas.reduce((s, c) => s + Number(c.valor || 0), 0)
  const totalPrevista = comissoes.filter(c => c.status === 'prevista').reduce((s, c) => s + Number(c.valor || 0), 0)
  const totalAprovada = comissoes.filter(c => c.status === 'aprovada').reduce((s, c) => s + Number(c.valor || 0), 0)
  const totalPaga = comissoes.filter(c => c.status === 'paga').reduce((s, c) => s + Number(c.valor || 0), 0)
  const totalPendente = comissoes.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor || 0), 0)

  const totalMes = comissoesMes.reduce((s, c) => s + Number(c.valor || 0), 0)
  const vendasMes = comissoesMes.length

  // For the goal, only count confirmed commissions (approved + paid)
  const comissoesMesConfirmadas = comissoesMes.filter(c => c.status === 'aprovada' || c.status === 'paga')
  const totalMesConfirmado = comissoesMesConfirmadas.reduce((s, c) => s + Number(c.valor || 0), 0)

  // Filter
  const comissoesFiltradas = filtroStatus === 'todos'
    ? comissoes
    : comissoes.filter(c => c.status === filtroStatus)

  // Meta progress (only confirmed commissions count towards goal)
  const valorMeta = meta?.valor_meta || 10000
  const progresso = Math.min(100, Math.round((totalMesConfirmado / valorMeta) * 100))
  const faltam = Math.max(0, valorMeta - totalMesConfirmado)

  function fmtMoeda(v) {
    if (!v && v !== 0) return 'R$ 0'
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  }

  if (carregando) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-lg w-48" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!tabelaExiste) {
    return (
      <div className="p-4 lg:p-8 max-w-[1000px] mx-auto">
        <h1 className="font-bold text-2xl text-slate-900 mb-4">Comissões</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <p className="text-3xl mb-3">⚠️</p>
          <p className="text-amber-800 font-medium mb-2">Tabela de comissões não encontrada</p>
          <p className="text-amber-600 text-sm">
            Execute o script SQL <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">supabase/setup_consultor_tables.sql</code> no Supabase para criar as tabelas necessárias.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-bold text-2xl text-slate-900">Minha Comissão</h1>
        <p className="text-slate-400 text-sm mt-0.5">Modelo: 1% do valor do veículo vendido</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white col-span-2 lg:col-span-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total geral</p>
          <p className="text-2xl font-bold">{fmtMoeda(totalGeral)}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> {fmtMoeda(totalPrevista)}</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {fmtMoeda(totalPendente)}</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> {fmtMoeda(totalAprovada)}</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {fmtMoeda(totalPaga)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/70">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Este mês</p>
          <p className="text-2xl font-bold text-slate-900">{fmtMoeda(totalMes)}</p>
          <p className="text-xs text-slate-400 mt-1">{vendasMes} venda{vendasMes !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/70">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">A receber</p>
          <p className="text-2xl font-bold text-amber-600">{fmtMoeda(totalPrevista + totalPendente + totalAprovada)}</p>
          <p className="text-xs text-slate-400 mt-1">Prevista + aprovada</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/70">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Já paga</p>
          <p className="text-2xl font-bold text-emerald-600">{fmtMoeda(totalPaga)}</p>
          <p className="text-xs text-slate-400 mt-1">Efetivamente recebida</p>
        </div>
      </div>

      {/* Meta do mês */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Meta de {MESES[mesAtual]}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {fmtMoeda(totalMesConfirmado)} / {fmtMoeda(valorMeta)}
            </p>
          </div>
          <span className="text-2xl font-bold text-slate-900">{progresso}%</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              progresso >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
              progresso >= 75 ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
              progresso >= 50 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
              'bg-gradient-to-r from-slate-400 to-slate-300'
            }`}
            style={{ width: `${progresso}%` }}
          />
        </div>

        {progresso < 100 && (
          <p className="text-xs text-slate-400">
            Faltam <span className="font-semibold text-slate-600">{fmtMoeda(faltam)}</span> para atingir a meta
          </p>
        )}
        {progresso >= 100 && (
          <p className="text-xs text-emerald-600 font-semibold">🎉 Meta atingida! Parabéns!</p>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <ChipFiltro ativo={filtroStatus === 'todos'} onClick={() => setFiltroStatus('todos')}>Todos</ChipFiltro>
        <ChipFiltro ativo={filtroStatus === 'prevista'} onClick={() => setFiltroStatus('prevista')}>Previstas</ChipFiltro>
        <ChipFiltro ativo={filtroStatus === 'pendente'} onClick={() => setFiltroStatus('pendente')}>Pendentes</ChipFiltro>
        <ChipFiltro ativo={filtroStatus === 'aprovada'} onClick={() => setFiltroStatus('aprovada')}>Aprovadas</ChipFiltro>
        <ChipFiltro ativo={filtroStatus === 'paga'} onClick={() => setFiltroStatus('paga')}>Pagas</ChipFiltro>
        <ChipFiltro ativo={filtroStatus === 'cancelada'} onClick={() => setFiltroStatus('cancelada')}>Canceladas</ChipFiltro>
      </div>

      {/* Commissions table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-slate-50/70 text-left text-[11px] text-slate-400 uppercase tracking-wider">
              <th className="px-6 py-3.5 font-semibold">Cliente</th>
              <th className="px-6 py-3.5 font-semibold">Valor da venda</th>
              <th className="px-6 py-3.5 font-semibold">Comissão (1%)</th>
              <th className="px-6 py-3.5 font-semibold">Status</th>
              <th className="px-6 py-3.5 font-semibold">Data</th>
            </tr>
          </thead>
          <tbody>
            {comissoesFiltradas.map((c) => {
              const cor = STATUS_COR[c.status] || STATUS_COR.prevista
              return (
                <tr key={c.id} className="border-t border-slate-50 hover:bg-blue-50/30 transition">
                  <td className="px-6 py-4 font-medium text-slate-800">{c.clientes?.nome || '—'}</td>
                  <td className="px-6 py-4 text-slate-600">{fmtMoeda(c.valor_venda)}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{fmtMoeda(c.valor)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${cor.bg} ${cor.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cor.dot}`} />
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              )
            })}
            {comissoesFiltradas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-14 text-center text-slate-400 text-sm">
                  {filtroStatus === 'todos' ? 'Nenhuma comissão registrada.' : 'Nenhuma comissão neste filtro.'}
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

function ChipFiltro({ ativo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition ${
        ativo ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'
      }`}
    >
      {children}
    </button>
  )
}
