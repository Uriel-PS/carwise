'use client'

import { useState } from 'react'

export default function GaleriaVeiculo({ fotos = [] }) {
  const [indexAtual, setIndexAtual] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  if (!fotos || fotos.length === 0) return null

  // Ensure photos are sorted by 'ordem'
  const fotosOrdenadas = [...fotos].sort((a, b) => a.ordem - b.ordem)

  function proxima(e) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setIndexAtual((prev) => (prev + 1) % fotosOrdenadas.length)
  }

  function anterior(e) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setIndexAtual((prev) => (prev - 1 + fotosOrdenadas.length) % fotosOrdenadas.length)
  }

  const minSwipeDistance = 50 

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX)

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    if (isLeftSwipe) {
      proxima()
    }
    if (isRightSwipe) {
      anterior()
    }
  }

  return (
    <div 
      className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 group shrink-0"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src={fotosOrdenadas[indexAtual].url} 
        alt="Foto do veículo" 
        className="object-contain w-full h-full transition-opacity duration-300 pointer-events-none"
      />

      {fotosOrdenadas.length > 1 && (
        <>
          <button 
            onClick={anterior}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white text-blue-900 rounded-full shadow-sm opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          
          <button 
            onClick={proxima}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white text-blue-900 rounded-full shadow-sm opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
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
