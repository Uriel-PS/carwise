'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const PRIORIDADE_COR = {
  urgente: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200' },
  alta: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200' },
  media: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', border: 'border-blue-200' },
  baixa: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', border: 'border-slate-200' },
}

export default function TarefasConsultor() {
  const router = useRouter()
  const [consultor, setConsultor] = useState(null)
  const [tarefas, setTarefas] = useState([])
  const [clientes, setClientes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState('pendentes')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [novaTarefa, setNovaTarefa] = useState({
    titulo: '', descricao: '', cliente_id: '', prioridade: 'media', prazo: ''
  })
  const [salvando, setSalvando] = useState(false)
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

    // Load clients for dropdown
    const { data: clientesData } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('consultor_id', consultorData.id)
      .order('nome')

    setClientes(clientesData || [])

    // Load tasks
    try {
      const { data: tarefasData, error } = await supabase
        .from('tarefas_consultor')
        .select('*, clientes ( nome )')
        .eq('consultor_id', consultorData.id)
        .order('created_at', { ascending: false })

      if (error) {
        setTabelaExiste(false)
      } else {
        setTarefas(tarefasData || [])
      }
    } catch {
      setTabelaExiste(false)
    }

    setCarregando(false)
  }, [router])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function criarTarefa(e) {
    e.preventDefault()
    setSalvando(true)

    const { error } = await supabase.from('tarefas_consultor').insert([{
      consultor_id: consultor.id,
      cliente_id: novaTarefa.cliente_id || null,
      titulo: novaTarefa.titulo,
      descricao: novaTarefa.descricao || null,
      prioridade: novaTarefa.prioridade,
      prazo: novaTarefa.prazo ? new Date(novaTarefa.prazo).toISOString() : null,
    }])

    setSalvando(false)

    if (!error) {
      if (novaTarefa.prazo && new Date(novaTarefa.prazo).toDateString() === new Date().toDateString()) {
        await supabase.from('notificacoes_consultor').insert([{
          consultor_id: consultor.id,
          tipo: 'prazo',
          titulo: 'Tarefa para hoje',
          mensagem: `A tarefa "${novaTarefa.titulo}" vence hoje.`,
          lida: false
        }])
      }

      setMostrarForm(false)
      setNovaTarefa({ titulo: '', descricao: '', cliente_id: '', prioridade: 'media', prazo: '' })
      carregar()
    } else {
      alert('Erro ao criar tarefa: ' + error.message)
    }
  }

  async function alterarStatus(id, novoStatus) {
    const updates = { status: novoStatus }
    if (novoStatus === 'concluida') updates.concluida_em = new Date().toISOString()

    await supabase.from('tarefas_consultor').update(updates).eq('id', id)
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  async function excluirTarefa(id) {
    if (!confirm('Excluir esta tarefa?')) return
    await supabase.from('tarefas_consultor').delete().eq('id', id)
    setTarefas(prev => prev.filter(t => t.id !== id))
  }

  // Filter
  const tarefasFiltradas = tarefas.filter(t => {
    if (filtro === 'pendentes') return t.status === 'pendente' || t.status === 'em_andamento'
    if (filtro === 'concluidas') return t.status === 'concluida'
    if (filtro === 'atrasadas') {
      return t.prazo && new Date(t.prazo) < new Date() && t.status !== 'concluida' && t.status !== 'cancelada'
    }
    if (filtro === 'hoje') {
      if (!t.prazo) return false
      return new Date(t.prazo).toDateString() === new Date().toDateString() && t.status !== 'concluida'
    }
    return true
  })

  const countPendentes = tarefas.filter(t => t.status === 'pendente' || t.status === 'em_andamento').length
  const countAtrasadas = tarefas.filter(t => t.prazo && new Date(t.prazo) < new Date() && t.status !== 'concluida' && t.status !== 'cancelada').length
  const countHoje = tarefas.filter(t => t.prazo && new Date(t.prazo).toDateString() === new Date().toDateString() && t.status !== 'concluida').length

  if (carregando) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-lg w-48" />
          <div className="h-64 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!tabelaExiste) {
    return (
      <div className="p-4 lg:p-8 max-w-[900px] mx-auto">
        <h1 className="font-bold text-2xl text-slate-900 mb-4">Tarefas</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <p className="text-3xl mb-3">⚠️</p>
          <p className="text-amber-800 font-medium mb-2">Tabela de tarefas não encontrada</p>
          <p className="text-amber-600 text-sm">
            Execute o script SQL <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">supabase/setup_consultor_tables.sql</code> no Supabase para criar as tabelas necessárias.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="font-bold text-2xl text-slate-900">Tarefas</h1>
          <p className="text-slate-400 text-sm mt-0.5">{countPendentes} pendente{countPendentes !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-sm"
        >
          {mostrarForm ? 'Cancelar' : '+ Nova tarefa'}
        </button>
      </div>

      {/* New task form */}
      {mostrarForm && (
        <form onSubmit={criarTarefa} className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6 mb-6 space-y-4">
          <input
            type="text"
            placeholder="Título da tarefa"
            value={novaTarefa.titulo}
            onChange={(e) => setNovaTarefa({ ...novaTarefa, titulo: e.target.value })}
            required
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none transition"
          />
          <textarea
            placeholder="Descrição (opcional)"
            value={novaTarefa.descricao}
            onChange={(e) => setNovaTarefa({ ...novaTarefa, descricao: e.target.value })}
            rows={2}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 resize-none focus:border-blue-400 focus:outline-none transition"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={novaTarefa.cliente_id}
              onChange={(e) => setNovaTarefa({ ...novaTarefa, cliente_id: e.target.value })}
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 bg-white focus:border-blue-400 focus:outline-none transition"
            >
              <option value="">Sem cliente</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <select
              value={novaTarefa.prioridade}
              onChange={(e) => setNovaTarefa({ ...novaTarefa, prioridade: e.target.value })}
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 bg-white focus:border-blue-400 focus:outline-none transition"
            >
              <option value="baixa">🔵 Baixa</option>
              <option value="media">🟢 Média</option>
              <option value="alta">🟡 Alta</option>
              <option value="urgente">🔴 Urgente</option>
            </select>
            <input
              type="datetime-local"
              value={novaTarefa.prazo}
              onChange={(e) => setNovaTarefa({ ...novaTarefa, prazo: e.target.value })}
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none transition"
            />
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            {salvando ? 'Criando...' : 'Criar tarefa'}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <ChipFiltro ativo={filtro === 'pendentes'} onClick={() => setFiltro('pendentes')}>
          Pendentes {countPendentes > 0 && `(${countPendentes})`}
        </ChipFiltro>
        <ChipFiltro ativo={filtro === 'hoje'} onClick={() => setFiltro('hoje')}>
          Hoje {countHoje > 0 && `(${countHoje})`}
        </ChipFiltro>
        <ChipFiltro ativo={filtro === 'atrasadas'} onClick={() => setFiltro('atrasadas')}>
          Atrasadas {countAtrasadas > 0 && `(${countAtrasadas})`}
        </ChipFiltro>
        <ChipFiltro ativo={filtro === 'concluidas'} onClick={() => setFiltro('concluidas')}>Concluídas</ChipFiltro>
        <ChipFiltro ativo={filtro === 'todas'} onClick={() => setFiltro('todas')}>Todas</ChipFiltro>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {tarefasFiltradas.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-12 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-slate-400 text-sm">
              {filtro === 'pendentes' ? 'Nenhuma tarefa pendente.' : 'Nenhuma tarefa neste filtro.'}
            </p>
          </div>
        ) : (
          tarefasFiltradas.map((t) => {
            const cor = PRIORIDADE_COR[t.prioridade] || PRIORIDADE_COR.media
            const prazo = t.prazo ? new Date(t.prazo) : null
            const atrasado = prazo && prazo < new Date() && t.status !== 'concluida'
            const ehHoje = prazo && prazo.toDateString() === new Date().toDateString()
            const concluida = t.status === 'concluida'

            return (
              <div
                key={t.id}
                className={`bg-white rounded-xl shadow-sm border p-4 transition hover:shadow-md ${
                  concluida ? 'opacity-60 border-slate-200' : `${cor.border}`
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => alterarStatus(t.id, concluida ? 'pendente' : 'concluida')}
                    className={`w-5 h-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition ${
                      concluida
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-slate-300 hover:border-blue-400'
                    }`}
                  >
                    {concluida && (
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                        <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${concluida ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {t.titulo}
                      </p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cor.bg} ${cor.text}`}>
                        {t.prioridade}
                      </span>
                    </div>
                    {t.descricao && (
                      <p className="text-xs text-slate-400 mt-1 truncate">{t.descricao}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {t.clientes?.nome && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span>👤</span> {t.clientes.nome}
                        </span>
                      )}
                      {prazo && (
                        <span className={`text-[11px] font-medium ${
                          atrasado ? 'text-red-600' : ehHoje ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          📅 {ehHoje ? 'Hoje' : atrasado ? 'Atrasado · ' : ''}{prazo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          {' '}{prazo.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!concluida && t.status === 'pendente' && (
                      <button
                        onClick={() => alterarStatus(t.id, 'em_andamento')}
                        className="text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition"
                      >
                        Iniciar
                      </button>
                    )}
                    <button
                      onClick={() => excluirTarefa(t.id)}
                      className="text-slate-300 hover:text-red-500 p-1 transition"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
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
