'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ContrapropostaModal({ proposta, onClose, onSalvo }) {
  const [valorNovo, setValorNovo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)

  const dadosProposta = proposta.origem === 'estoque'
    ? {
        nome: `${proposta.veiculos?.marca} ${proposta.veiculos?.modelo} ${proposta.veiculos?.versao || ''}`.trim(),
        preco: proposta.veiculos?.preco,
      }
    : {
        nome: `${proposta.marca_externa} ${proposta.modelo_externa}`.trim(),
        preco: proposta.preco_externa,
      }

  async function salvar(e) {
    e.preventDefault()
    if (!valorNovo) return
    setSalvando(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session.user

    const { data: consultorData } = await supabase
      .from('consultores').select('nome').eq('auth_id', user.id).maybeSingle()

    // Register in historico_negociacao as a structured note
    const valorAnterior = dadosProposta.preco
    const valorFormatado = Number(valorNovo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    const valorAnteriorFormatado = valorAnterior
      ? Number(valorAnterior).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
      : 'não informado'

    let observacao = `💰 Contraproposta para ${dadosProposta.nome}\n`
    observacao += `Valor anterior: ${valorAnteriorFormatado}\n`
    observacao += `Novo valor proposto: ${valorFormatado}`
    if (motivo) observacao += `\nMotivo: ${motivo}`

    await supabase.from('historico_negociacao').insert([{
      cliente_id: proposta.cliente_id,
      autor_tipo: 'consultor',
      autor_nome: consultorData?.nome || 'Consultor',
      evento: 'nota',
      observacao,
    }])

    // Try to save to contrapropostas table (optional, might not exist)
    try {
      await supabase.from('contrapropostas').insert([{
        proposta_id: proposta.id,
        valor_anterior: valorAnterior || null,
        valor_novo: Number(valorNovo),
        motivo: motivo || null,
        criado_por: user.id,
      }])
    } catch (err) {
      // Table might not exist yet, that's OK
    }

    setSalvando(false)
    onSalvo?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <h3 className="text-white font-bold text-lg">Registrar contraproposta</h3>
          <p className="text-blue-200 text-sm mt-1">{dadosProposta.nome}</p>
        </div>

        <form onSubmit={salvar} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Valor atual
            </label>
            <p className="text-lg font-bold text-gray-900">
              {dadosProposta.preco
                ? Number(dadosProposta.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
                : '—'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Novo valor proposto (R$)
            </label>
            <input
              type="number"
              value={valorNovo}
              onChange={(e) => setValorNovo(e.target.value)}
              placeholder="Ex: 85000"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-lg font-semibold placeholder-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Motivo / Justificativa
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Cliente aceitaria se baixasse o preço. Concessionária pode negociar..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={salvando || !valorNovo}
              className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando ? 'Salvando...' : 'Registrar contraproposta'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
