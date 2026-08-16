'use client'

import { useState } from 'react'

export default function GaleriaVeiculo({ fotos = [] }) {
  const [indexAtual, setIndexAtual] = useState(0)

  if (!fotos || fotos.length === 0) return null

  // Ensure photos are sorted by 'ordem'
  const fotosOrdenadas = [...fotos].sort((a, b) => a.ordem - b.ordem)

  function proxima(e) {
    e.preventDefault()
    e.stopPropagation()
    setIndexAtual((prev) => (prev + 1) % fotosOrdenadas.length)
  }

  function anterior(e) {
    e.preventDefault()
    e.stopPropagation()
    setIndexAtual((prev) => (prev - 1 + fotosOrdenadas.length) % fotosOrdenadas.length)
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 group shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src={fotosOrdenadas[indexAtual].url} 
        alt="Foto do veículo" 
        className="object-contain w-full h-full transition-opacity duration-300"
      />

      {fotosOrdenadas.length > 1 && (
        <>
          <button 
            onClick={anterior}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white text-blue-900 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          
          <button 
            onClick={proxima}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white text-blue-900 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {fotosOrdenadas.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all ${i === indexAtual ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
