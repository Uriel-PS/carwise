'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const ROTULOS_EVENTO = {
  cadastro: 'Perfil cadastrado',
  buscando: 'Consultor iniciou a busca de veículos',
  negociando: 'Negociação iniciada com a concessionária',
  documentacao: 'Documentação em andamento',
  entrega: 'Veículo entregue',
  nota: 'Observação registrada',
}

export default function HistoricoNegociacao({ clienteId, podeAdicionar = false, podeVerOcultos = false }) {
  const [eventos, setEventos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [novaObservacao, setNovaObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mostrarOcultos, setMostrarOcultos] = useState(false)

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId])

  async function carregar() {
    const { data, error } = await supabase
      .from('historico_negociacao')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    if (!error) setEventos(data || [])
    setCarregando(false)
  }

  async function adicionarNota(e) {
    e.preventDefault()
    if (!novaObservacao.trim()) return

    setSalvando(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session.user

    const { data: consultorData } = await supabase
      .from('consultores').select('nome').eq('auth_id', user.id).maybeSingle()

    const autorTipo = consultorData ? 'consultor' : 'admin'
    const autorNome = consultorData?.nome || 'Administrador'

    const { error } = await supabase.from('historico_negociacao').insert([{
      cliente_id: clienteId,
      autor_tipo: autorTipo,
      autor_nome: autorNome,
      evento: 'nota',
      observacao: novaObservacao,
    }])

    setSalvando(false)

    if (!error) {
      setNovaObservacao('')
      setMostrarForm(false)
      carregar()
    }
  }

  async function ocultarEvento(id) {
    if (!confirm('Remover este item da visualização? Ele continuará salvo para o administrador.')) return
    await supabase.from('historico_negociacao').update({ oculto: true }).eq('id', id)
    carregar()
  }

  if (carregando) return null

  const eventosVisiveis = mostrarOcultos ? eventos : eventos.filter((ev) => !ev.oculto)

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        {podeAdicionar && (
          !mostrarForm ? (
            <button
              onClick={() => setMostrarForm(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-full transition"
            >
              + Adicionar observação
            </button>
          ) : null
        )}

        {podeVerOcultos && (
          <button
            onClick={() => setMostrarOcultos(!mostrarOcultos)}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700 ml-auto"
          >
            {mostrarOcultos ? 'Ocultar removidos' : 'Ver itens removidos'}
          </button>
        )}
      </div>

      {podeAdicionar && mostrarForm && (
        <form onSubmit={adicionarNota} className="bg-blue-50/50 rounded-xl p-4 space-y-2 mb-5">
          <textarea
            value={novaObservacao}
            onChange={(e) => setNovaObservacao(e.target.value)}
            placeholder="Ex: Cliente pediu para remarcar o test drive."
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none transition resize-none"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={salvando} className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-full hover:bg-blue-700 transition disabled:opacity-50">
              {salvando ? 'Salvando...' : 'Registrar'}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-xs font-semibold text-gray-500 px-3 py-1.5">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {eventosVisiveis.length === 0 ? (
        <p className="text-gray-400 text-sm">Nenhum evento registrado ainda.</p>
      ) : (
        <div className="space-y-0">
          {eventosVisiveis.map((ev, i) => (
            <div key={ev.id} className={`flex gap-3 pb-5 last:pb-0 ${ev.oculto ? 'opacity-50' : ''}`}>
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${ev.oculto ? 'bg-gray-300' : 'bg-blue-600'}`} />
                {i < eventosVisiveis.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800">
                    {ROTULOS_EVENTO[ev.evento] || ev.evento}
                    {ev.oculto && <span className="text-xs text-gray-400 font-normal ml-2">(removido)</span>}
                  </p>
                  {podeAdicionar && !ev.oculto && (
                    <button onClick={() => ocultarEvento(ev.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">
                      Remover
                    </button>
                  )}
                </div>
                {ev.observacao && (
                  <p className="text-sm text-gray-500 mt-1 bg-gray-50 rounded-lg px-3 py-2">{ev.observacao}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {ev.autor_nome ? `${ev.autor_nome} · ` : ''}
                  {new Date(ev.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}