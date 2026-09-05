'use client'

import { useEffect, useState } from 'react'

/**
 * Toast animado que aparece quando chega uma nova notificação.
 * Posiciona no canto superior direito com animação suave de slide-in.
 */
export default function ToastNotificacao({ notificacao, onFechar }) {
  const [visivel, setVisivel] = useState(false)
  const [saindo, setSaindo] = useState(false)

  useEffect(() => {
    if (notificacao) {
      setVisivel(true)
      setSaindo(false)

      const timer = setTimeout(() => {
        fechar()
      }, 5000)

      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificacao])

  function fechar() {
    setSaindo(true)
    setTimeout(() => {
      setVisivel(false)
      setSaindo(false)
      onFechar?.()
    }, 300)
  }

  if (!visivel || !notificacao) return null

  const TIPO_ICONE = {
    novo_cliente: '🔔',
    test_drive: '🚗',
    concessionaria: '🏢',
    prazo: '⏰',
    comissao: '💰',
    proposta: '📋',
    mensagem: '💬',
    agendamento: '📅',
    status: '📊',
    contrato: '📄',
    pagamento: '💳',
    info: '💡',
    sistema: '⚙️',
  }

  const icone = TIPO_ICONE[notificacao.tipo] || '🔔'

  return (
    <div
      className={`fixed top-4 right-4 z-[100] max-w-sm w-full pointer-events-auto transition-all duration-300 ease-out ${
        saindo
          ? 'opacity-0 translate-x-8'
          : 'opacity-100 translate-x-0'
      }`}
      style={{
        animation: saindo ? undefined : 'slideInRight 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div className="bg-white rounded-2xl shadow-[0_20px_60px_-16px_rgba(10,34,71,0.3)] border border-slate-200/50 overflow-hidden">
        {/* Barra de progresso */}
        <div className="h-[3px] bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
            style={{
              animation: 'shrink 5s linear forwards',
            }}
          />
        </div>

        <div className="p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-lg">
            {icone}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {notificacao.titulo}
            </p>
            {notificacao.mensagem && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                {notificacao.mensagem}
              </p>
            )}
            <p className="text-[10px] text-slate-400 mt-1">agora mesmo</p>
          </div>
          <button
            onClick={fechar}
            className="text-slate-400 hover:text-slate-600 transition p-1 -mt-1 -mr-1 rounded-lg hover:bg-slate-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}
