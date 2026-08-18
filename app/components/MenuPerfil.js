'use client'

import { useState, useRef, useEffect } from 'react'

export default function MenuPerfil({ nome, onLogout }) {
  const [aberto, setAberto] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function fecharSeClicarFora(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', fecharSeClicarFora)
    return () => document.removeEventListener('mousedown', fecharSeClicarFora)
  }, [])

  const iniciais = (nome || 'U').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-gray-50 transition"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-xs shrink-0">
          {iniciais}
        </div>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className={`transition-transform ${aberto ? 'rotate-180' : ''}`}>
          <path d="M3 5l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-[0_10px_40px_-8px_rgba(10,34,71,0.25)] border border-gray-100 overflow-hidden z-20">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-sm font-semibold text-blue-950 truncate">{nome}</p>
          </div>
          <a href="/painel/editar" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#6B7A99" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#6B7A99" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Editar meu perfil
          </a>
          <a href="/painel/perfil" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#6B7A99" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 2v6h6" stroke="#6B7A99" strokeWidth="1.6" strokeLinejoin="round"/></svg>
            Meus dados completos
          </a>
          <a href="/painel/config" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke="#6B7A99" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Acesso e Segurança
          </a>
          <a href="/painel/planos" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" stroke="#6B7A99" strokeWidth="1.8" strokeLinejoin="round"/></svg>
            Meus planos
          </a>
          <button onClick={onLogout} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition w-full text-left border-t border-gray-50">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="#DC2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Sair
          </button>
        </div>
      )}
    </div>
  )
}