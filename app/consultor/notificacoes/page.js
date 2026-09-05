'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { useNotificacoesRealtime } from '../../lib/useNotificacoesRealtime'

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
  const [consultorId, setConsultorId] = useState(null)
  const [carregandoAuth, setCarregandoAuth] = useState(true)
  const [filtro, setFiltro] = useState('todas')
  const [tabelaExiste, setTabelaExiste] = useState(true)
  const [recentIds, setRecentIds] = useState(new Set())

  // Autenticação
  useEffect(() => {
    async function verificar() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/consultor/login'); return }

      const { data: consultorData } = await supabase
        .from('consultores')
        .select('id')
        .eq('auth_id', sessionData.session.user.id)
        .eq('ativo', true)
        .maybeSingle()

      if (!consultorData) { router.push('/consultor/login'); return }
      setConsultorId(consultorData.id)
      setCarregandoAuth(false)
    }
    verificar()
  }, [router])

  // Hook de notificações em tempo real
  const {
    notificacoes,
    naoLidas,
    carregando,
    marcarComoLida,
    marcarTodasComoLidas,
    novaNotificacao,
  } = useNotificacoesRealtime({
    tabela: 'notificacoes_consultor',
    colunaId: 'consultor_id',
    valorId: consultorId,
    habilitado: !!consultorId,
  })

  // Rastrear notificações que chegaram em tempo real (para animação)
  useEffect(() => {
    if (novaNotificacao) {
      setRecentIds(prev => new Set(prev).add(novaNotificacao.id))
      // Remover destaque após 3s
      const timer = setTimeout(() => {
        setRecentIds(prev => {
          const next = new Set(prev)
          next.delete(novaNotificacao.id)
          return next
        })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [novaNotificacao])

  const notifsFiltradas = filtro === 'todas'
    ? notificacoes
    : filtro === 'nao_lidas'
      ? notificacoes.filter(n => !n.lida)
      : notificacoes.filter(n => n.tipo === filtro)

  // Agrupar por dia
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

  if (carregandoAuth || carregando) {
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
            Execute o script SQL <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">supabase/setup_realtime_notifications.sql</code> no Supabase.
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
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-2xl text-slate-900">Notificações</h1>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">TEMPO REAL</span>
          </div>
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
                const isRecent = recentIds.has(n.id)

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.lida) marcarComoLida(n.id)
                      if (n.link) router.push(n.link)
                    }}
                    className={`flex items-start gap-3 p-4 rounded-xl transition-all duration-300 cursor-pointer ${
                      isRecent
                        ? 'bg-green-50/70 border border-green-200/60 ring-1 ring-green-300/30 shadow-sm'
                        : n.lida
                          ? 'bg-white border border-slate-200/50 hover:bg-slate-50'
                          : 'bg-blue-50/50 border border-blue-200/50 hover:bg-blue-50'
                    }`}
                    style={isRecent ? { animation: 'slideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1)' } : undefined}
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
                        {isRecent && <span className="text-[9px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full shrink-0">NOVA</span>}
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

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
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
