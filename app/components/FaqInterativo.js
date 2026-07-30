'use client'

import { useState } from 'react'
import { FAQ_CATEGORIAS } from '../lib/faqConteudo'

export default function FaqInterativo() {
  // tela: 'categorias' | 'perguntas' | 'resposta'
  const [tela, setTela] = useState('categorias')
  const [categoriaAtiva, setCategoriaAtiva] = useState(null)
  const [perguntaAtiva, setPerguntaAtiva] = useState(null)

  function abrirCategoria(categoria) {
    setCategoriaAtiva(categoria)
    setTela('perguntas')
  }

  function abrirPergunta(pergunta) {
    setPerguntaAtiva(pergunta)
    setTela('resposta')
  }

  function voltar() {
    if (tela === 'resposta') { setTela('perguntas'); setPerguntaAtiva(null); return }
    if (tela === 'perguntas') { setTela('categorias'); setCategoriaAtiva(null); return }
  }

  return (
    <div className="bg-white rounded-2xl shadow-[0_20px_50px_-24px_rgba(10,34,71,0.15)] border border-gray-100 overflow-hidden max-w-md w-full">
      {/* Cabeçalho */}
      <div className="bg-blue-950 px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 22c5.5 0 10-4 10-9s-4.5-9-10-9S2 8 2 13c0 2 .7 3.8 2 5.3L3 22l4.5-1.2c1.4.7 3 1.2 4.5 1.2z" stroke="white" strokeWidth="1.6" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <p className="text-white font-semibold text-sm">Central de ajuda CarWise</p>
          <p className="text-blue-200 text-xs">Como posso te ajudar hoje?</p>
        </div>
      </div>

      {/* Corpo */}
      <div className="p-5 min-h-[280px]">
        {tela !== 'categorias' && (
          <button onClick={voltar} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 mb-4 font-medium transition">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Voltar
          </button>
        )}

        {tela === 'categorias' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-3">Escolha um assunto:</p>
            {FAQ_CATEGORIAS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => abrirCategoria(cat)}
                className="w-full flex items-center justify-between text-left border border-gray-100 rounded-xl px-4 py-3 hover:border-blue-300 hover:bg-blue-50/40 transition"
              >
                <span className="text-sm font-medium text-blue-950">{cat.titulo}</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 3l4 4-4 4" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            ))}
          </div>
        )}

        {tela === 'perguntas' && categoriaAtiva && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-3">{categoriaAtiva.titulo}</p>
            {categoriaAtiva.perguntas.map((p, i) => (
              <button
                key={i}
                onClick={() => abrirPergunta(p)}
                className="w-full text-left border border-gray-100 rounded-xl px-4 py-3 hover:border-blue-300 hover:bg-blue-50/40 transition"
              >
                <span className="text-sm text-gray-700">{p.pergunta}</span>
              </button>
            ))}
          </div>
        )}

        {tela === 'resposta' && perguntaAtiva && (
          <div>
            <p className="text-sm font-semibold text-blue-950 mb-3">{perguntaAtiva.pergunta}</p>
            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 mb-5">
              {perguntaAtiva.resposta}
            </p>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 mb-3">Não resolveu sua dúvida?</p>
              <a
                href="/contato?assunto=outro"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                Falar com um atendente
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}