'use client'

import { useState } from 'react'
import ChatConsultor from './ChatConsultor'

export default function ChatFlutuante({ clienteId, autorTipo, autorId, autorNome, tituloChat, subtitulo, naoLidas = 0, onAbrirChat }) {
  const [aberto, setAberto] = useState(false)

  if (!clienteId) return null

  return (
    <>
      {aberto && (
        <div className="fixed bottom-4 right-6 z-50 w-[340px] bg-white rounded-2xl shadow-[0_20px_60px_-16px_rgba(10,34,71,0.35)] border border-gray-100 overflow-hidden">
          <div className="bg-blue-950 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white font-semibold text-sm">
                {(tituloChat || 'C')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">{tituloChat || 'Chat'}</p>
                {subtitulo && <p className="text-blue-200 text-xs leading-tight">{subtitulo}</p>}
              </div>
            </div>
            <button onClick={() => setAberto(false)} className="text-white/70 hover:text-white transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="p-4">
            <ChatConsultor
              clienteId={clienteId}
              autorTipo={autorTipo}
              autorId={autorId}
              autorNome={autorNome}
            />
          </div>
        </div>
      )}

      {!aberto && (
        <button
          onClick={() => {
            setAberto(true)
            if (onAbrirChat) onAbrirChat()
          }}
          className={`fixed bottom-4 right-6 z-50 flex items-center gap-3 bg-white rounded-full shadow-[0_10px_30px_-6px_rgba(10,34,71,0.3)] border border-gray-100 pl-3 pr-5 py-2.5 hover:-translate-y-0.5 transition ${
            naoLidas > 0 ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''
          }`}
        >
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {(tituloChat || 'C')[0].toUpperCase()}
            </div>
            {naoLidas > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {naoLidas}
              </span>
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-blue-950 leading-tight">
              {naoLidas > 0 ? 'Nova mensagem' : tituloChat || 'Chat'}
            </p>
            <p className="text-xs text-gray-400 leading-tight">
              {naoLidas > 0 ? `de ${tituloChat}` : 'Clique para conversar'}
            </p>
          </div>
        </button>
      )}
    </>
  )
}