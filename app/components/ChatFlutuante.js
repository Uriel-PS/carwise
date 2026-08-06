'use client'

import { useState } from 'react'
import ChatConsultor from './ChatConsultor'

export default function ChatFlutuante({ clienteId, autorTipo, autorId, autorNome, tituloChat, naoLidas = 0 }) {
  const [aberto, setAberto] = useState(false)

  if (!clienteId) return null

  return (
    <>
      {/* Janela do chat */}
      {aberto && (
        <div className="fixed bottom-24 right-6 z-50 w-[340px] bg-white rounded-2xl shadow-[0_20px_60px_-16px_rgba(10,34,71,0.35)] border border-gray-100 overflow-hidden">
          <div className="bg-blue-950 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="white" strokeWidth="1.6" strokeLinejoin="round"/></svg>
              </div>
              <p className="text-white font-semibold text-sm">{tituloChat || 'Chat'}</p>
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

      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(!aberto)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-[0_10px_30px_-6px_rgba(43,95,224,0.5)] flex items-center justify-center transition hover:-translate-y-0.5"
      >
        {aberto ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/></svg>
            {naoLidas > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {naoLidas}
              </span>
            )}
          </>
        )}
      </button>
    </>
  )
}