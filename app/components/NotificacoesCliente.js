'use client'

import { useState, useRef, useEffect } from 'react'
import { useNotificacoesRealtime } from '../lib/useNotificacoesRealtime'

/**
 * Dropdown de notificações para o painel do cliente.
 * Inclui ícone de sino com badge, dropdown com lista de notificações.
 */
export default function NotificacoesCliente({ clienteId }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)

  const {
    notificacoes,
    naoLidas,
    carregando,
    marcarComoLida,
    marcarTodasComoLidas,
    excluirNotificacao,
    novaNotificacao,
    limparNovaNotificacao,
  } = useNotificacoesRealtime({
    tabela: 'notificacoes_cliente',
    colunaId: 'cliente_id',
    valorId: clienteId,
    habilitado: !!clienteId,
  })

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickFora(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  const TIPO_ICONE = {
    proposta: '📋',
    mensagem: '💬',
    agendamento: '📅',
    status: '📊',
    contrato: '📄',
    pagamento: '💳',
    info: '💡',
    sistema: '⚙️',
  }

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

  if (!clienteId) return null

  return (
    <div ref={ref} className="relative z-[100]">
      {/* Botão do sino */}
      <button
        onClick={() => setAberto(!aberto)}
        className="relative p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 animate-pulse">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] bg-white rounded-2xl shadow-[0_20px_60px_-16px_rgba(10,34,71,0.25)] border border-slate-200/50 overflow-hidden z-[100]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Notificações</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {naoLidas > 0 ? `${naoLidas} nova${naoLidas !== 1 ? 's' : ''}` : 'Todas lidas'}
              </p>
            </div>
            {naoLidas > 0 && (
              <button
                onClick={marcarTodasComoLidas}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="overflow-y-auto max-h-[380px]">
            {carregando ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : notificacoes.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-slate-400 text-xs">Nenhuma notificação ainda.</p>
              </div>
            ) : (
              notificacoes.slice(0, 20).map((n) => {
                const icone = TIPO_ICONE[n.tipo] || '🔔'
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.lida) marcarComoLida(n.id)
                    }}
                    className={`group flex items-start gap-3 px-5 py-3.5 transition cursor-pointer border-b border-slate-50 last:border-0 ${
                      n.lida
                        ? 'bg-white hover:bg-slate-50'
                        : 'bg-blue-50/40 hover:bg-blue-50/60'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-sm">
                      {icone}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-semibold truncate ${n.lida ? 'text-slate-500' : 'text-slate-800'}`}>
                          {n.titulo}
                        </p>
                        {!n.lida && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                      </div>
                      {n.mensagem && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{n.mensagem}</p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center justify-center opacity-40 hover:opacity-100 transition duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          excluirNotificacao(n.id)
                        }}
                        className="text-slate-400 hover:text-red-500 transition p-1.5 rounded-md hover:bg-red-50"
                        title="Excluir notificação"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0 mt-0.5">
                      {tempoRelativo(n.created_at)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
