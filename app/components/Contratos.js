'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { gerarTextoContrato } from '../lib/gerarContrato'

export default function Contratos({ clienteId, podeGerar = false, nomeCliente, cpfCliente }) {
  const [contratos, setContratos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [planoEscolhido, setPlanoEscolhido] = useState('Básico')
  const [gerando, setGerando] = useState(false)
  const [contratoAberto, setContratoAberto] = useState(null)
  const [aceitando, setAceitando] = useState(false)

  const VALORES = { 'Básico': 199, 'Premium': 499, 'Concierge': 999 }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId])

  async function carregar() {
    const { data } = await supabase
      .from('contratos')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    setContratos(data || [])
    setCarregando(false)
  }

  async function gerarContrato(e) {
    e.preventDefault()
    setGerando(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const authId = sessionData.session.user.id

    const texto = gerarTextoContrato({
      nomeCliente: nomeCliente || 'Cliente',
      cpfCliente: cpfCliente || 'não informado',
      plano: planoEscolhido,
      valor: VALORES[planoEscolhido],
    })

    const { error } = await supabase.from('contratos').insert([{
      cliente_id: clienteId,
      plano: planoEscolhido,
      conteudo: texto,
      criado_por: authId,
    }])

    setGerando(false)

    if (!error) {
      setMostrarForm(false)
      carregar()
    }
  }

  async function aceitarContrato(id) {
    setAceitando(true)

    await supabase
      .from('contratos')
      .update({
        status: 'aceito',
        aceito_em: new Date().toISOString(),
      })
      .eq('id', id)

    setAceitando(false)
    setContratoAberto(null)
    carregar()
  }

  async function recusarContrato(id) {
    if (!confirm('Tem certeza que deseja recusar este contrato?')) return
    await supabase.from('contratos').update({ status: 'recusado' }).eq('id', id)
    setContratoAberto(null)
    carregar()
  }

  if (carregando) return null

  if (contratoAberto) {
    return (
      <div>
        <button onClick={() => setContratoAberto(null)} className="text-xs text-gray-400 hover:text-blue-600 mb-4 font-medium">
          ← Voltar
        </button>
        <div className="bg-gray-50 rounded-xl p-5 mb-5 max-h-96 overflow-y-auto">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{contratoAberto.conteudo}</pre>
        </div>

        {contratoAberto.status === 'pendente' && !podeGerar && (
          <div className="flex gap-2">
            <button
              onClick={() => aceitarContrato(contratoAberto.id)}
              disabled={aceitando}
              className="bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {aceitando ? 'Registrando...' : '✓ Li e aceito os termos'}
            </button>
            <button
              onClick={() => recusarContrato(contratoAberto.id)}
              className="border border-gray-200 text-gray-600 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition"
            >
              Recusar
            </button>
          </div>
        )}

        {contratoAberto.status === 'aceito' && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">
            ✓ Contrato aceito em {new Date(contratoAberto.aceito_em).toLocaleString('pt-BR')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      {podeGerar && (
        <div className="mb-5">
          {!mostrarForm ? (
            <button
              onClick={() => setMostrarForm(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-full transition"
            >
              + Gerar novo contrato
            </button>
          ) : (
            <form onSubmit={gerarContrato} className="bg-blue-50/50 rounded-xl p-4 space-y-3">
              <select
                value={planoEscolhido}
                onChange={(e) => setPlanoEscolhido(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
              >
                <option value="Básico">Básico — R$199</option>
                <option value="Premium">Premium — R$499</option>
                <option value="Concierge">Concierge — R$999</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" disabled={gerando} className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-full hover:bg-blue-700 transition disabled:opacity-50">
                  {gerando ? 'Gerando...' : 'Gerar contrato'}
                </button>
                <button type="button" onClick={() => setMostrarForm(false)} className="text-xs font-semibold text-gray-500 px-3 py-1.5">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {contratos.length === 0 ? (
        <p className="text-gray-400 text-sm">Nenhum contrato gerado ainda.</p>
      ) : (
        <div className="space-y-2">
          {contratos.map((c) => (
            <button
              key={c.id}
              onClick={() => setContratoAberto(c)}
              className="w-full flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3 hover:border-blue-300 hover:bg-blue-50/40 transition text-left"
            >
              <div>
                <p className="text-sm font-medium text-blue-950">Contrato — Plano {c.plano}</p>
                <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <span className={`text-xs font-mono px-2.5 py-1 rounded-full shrink-0 ${
                c.status === 'aceito' ? 'bg-green-50 text-green-700' :
                c.status === 'recusado' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-700'
              }`}>
                {c.status === 'aceito' ? '✓ Aceito' : c.status === 'recusado' ? 'Recusado' : 'Pendente'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}