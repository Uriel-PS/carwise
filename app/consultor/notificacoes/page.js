'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const TIPO_CONFIG = {
  novo_cliente: { icone: '🔔', cor: 'blue', label: 'Novo cliente' },
  test_drive: { icone: '🚗', cor: 'violet', label: 'Test Drive' },
  concessionaria: { icone: '🏢', cor: 'amber', label: 'Concessionária' },
  prazo: { icone: '⏰', cor: 'red', label: 'Prazo' },
  comissao: { icone: '💰', cor: 'emerald', label: 'Comissão' },
  info: { icone: '💡', cor: 'slate', label: 'Info' },
  sistema: { icone: '⚙️', cor: 'slate', label: 'Sistema' },
}

export default function NotificacoesConsultor() {
  const router = useRouter()
  const [consultor, setConsultor] = useState(null)
  const [notificacoes, setNotificacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState('todas')
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

    try {
      const { data: notifsData, error } = await supabase
        .from('notificacoes_consultor')
        .select('*')
        .eq('consultor_id', consultorData.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        setTabelaExiste(false)
      } else {
        setNotificacoes(notifsData || [])
      }
    } catch {
      setTabelaExiste(false)
    }

    setCarregando(false)
  }, [router])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function marcarComoLida(id) {
    await supabase.from('notificacoes_consultor').update({ lida: true }).eq('id', id)
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
  }

  async function marcarTodasComoLidas() {
    if (!consultor) return
    await supabase
      .from('notificacoes_consultor')
      .update({ lida: true })
      .eq('consultor_id', consultor.id)
      .eq('lida', false)

    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
  }

  const naoLidas = notificacoes.filter(n => !n.lida).length

  const notifsFiltradas = filtro === 'todas'
    ? notificacoes
    : filtro === 'nao_lidas'
      ? notificacoes.filter(n => !n.lida)
      : notificacoes.filter(n => n.tipo === filtro)

  // Group by date
  const porDia = {}
  notifsFiltradas.forEach(n => {
    const d = new Date(n.created_at)
    const hoje = new Date()
    const ontem = new Date(hoje)
    ontem.setDate(ontem.getDate() - 1)

    let label
    if (d.toDateString() === hoje.toDateString()) label = 'Hoje'
    else if (d.toDateString() === ontem.toDateString()) label = 'Ontem'
    else label = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

    if (!porDia[label]) porDia[label] = []
    porDia[label].push(n)
  })

  function tempoRelativo(data) {
    const agora = Date.now()
    const diff = agora - new Date(data).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'agora'
    if (min < 60) return `${min}min`
    const horas = Math.floor(min / 60)
    if (horas < 24) return `${horas}h`
    const dias = Math.floor(horas / 24)
    return `${dias}d`
  }

  if (carregando) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-lg w-48" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!tabelaExiste) {
    return (
      <div className="p-4 lg:p-8 max-w-[800px] mx-auto">
        <h1 className="font-bold text-2xl text-slate-900 mb-4">Notificações</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <p className="text-3xl mb-3">⚠️</p>
          <p className="text-amber-800 font-medium mb-2">Tabela de notificações não encontrada</p>
          <p className="text-amber-600 text-sm">
            Execute o script SQL <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">supabase/setup_consultor_tables.sql</code> no Supabase.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-[800px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="font-bold text-2xl text-slate-900">Notificações</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {naoLidas > 0 ? `${naoLidas} não lida${naoLidas !== 1 ? 's' : ''}` : 'Todas lidas'}
          </p>
        </div>
        {naoLidas > 0 && (
          <button
            onClick={marcarTodasComoLidas}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <ChipFiltro ativo={filtro === 'todas'} onClick={() => setFiltro('todas')}>Todas</ChipFiltro>
        <ChipFiltro ativo={filtro === 'nao_lidas'} onClick={() => setFiltro('nao_lidas')}>
          Não lidas {naoLidas > 0 && `(${naoLidas})`}
        </ChipFiltro>
        <ChipFiltro ativo={filtro === 'novo_cliente'} onClick={() => setFiltro('novo_cliente')}>Clientes</ChipFiltro>
        <ChipFiltro ativo={filtro === 'test_drive'} onClick={() => setFiltro('test_drive')}>Test Drive</ChipFiltro>
        <ChipFiltro ativo={filtro === 'prazo'} onClick={() => setFiltro('prazo')}>Prazos</ChipFiltro>
        <ChipFiltro ativo={filtro === 'comissao'} onClick={() => setFiltro('comissao')}>Comissões</ChipFiltro>
      </div>

      {/* Notifications */}
      {Object.keys(porDia).length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-12 text-center">
          <p className="text-3xl mb-2">🔔</p>
          <p className="text-slate-400 text-sm">Nenhuma notificação.</p>
        </div>
      ) : (
        Object.entries(porDia).map(([dia, notifs]) => (
          <div key={dia} className="mb-6">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">{dia}</p>
            <div className="space-y-2">
              {notifs.map((n) => {
                const config = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.info
                const corMap = {
                  blue: 'bg-blue-100',
                  violet: 'bg-violet-100',
                  amber: 'bg-amber-100',
                  red: 'bg-red-100',
                  emerald: 'bg-emerald-100',
                  slate: 'bg-slate-100',
                }

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.lida) marcarComoLida(n.id)
                      if (n.link) router.push(n.link)
                    }}
                    className={`flex items-start gap-3 p-4 rounded-xl transition cursor-pointer ${
                      n.lida
                        ? 'bg-white border border-slate-200/50 hover:bg-slate-50'
                        : 'bg-blue-50/50 border border-blue-200/50 hover:bg-blue-50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${corMap[config.cor] || corMap.slate}`}>
                      <span className="text-base">{config.icone}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold truncate ${n.lida ? 'text-slate-600' : 'text-slate-900'}`}>
                          {n.titulo}
                        </p>
                        {!n.lida && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                      </div>
                      {n.mensagem && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.mensagem}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0 mt-0.5">
                      {tempoRelativo(n.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
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
