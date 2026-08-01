'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const STATUS_LABEL = {
  solicitado: 'Aguardando confirmação',
  confirmado: 'Confirmado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const STATUS_COR = {
  solicitado: 'bg-amber-50 text-amber-700',
  confirmado: 'bg-green-50 text-green-700',
  concluido: 'bg-blue-50 text-blue-700',
  cancelado: 'bg-red-50 text-red-500',
}

export default function Agendamentos({ clienteId, autorTipo, podeGerenciar = false }) {
  const [agendamentos, setAgendamentos] = useState([])
  const [propostas, setPropostas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ data_hora: '', local: '', observacao: '', proposta_id: '' })

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId])

  async function carregar() {
    const { data: ag } = await supabase
      .from('agendamentos')
      .select('*, propostas ( veiculos ( marca, modelo ), marca_externa, modelo_externa )')
      .eq('cliente_id', clienteId)
      .order('data_hora', { ascending: true })

    setAgendamentos(ag || [])

    if (podeGerenciar) {
      const { data: prop } = await supabase
        .from('propostas')
        .select('id, origem, marca_externa, modelo_externa, veiculos ( marca, modelo )')
        .eq('cliente_id', clienteId)
        .eq('status', 'aceita')

      setPropostas(prop || [])
    }

    setCarregando(false)
  }

  async function criarAgendamento(e) {
    e.preventDefault()
    setSalvando(true)

    const { error } = await supabase.from('agendamentos').insert([{
      cliente_id: clienteId,
      proposta_id: form.proposta_id || null,
      data_hora: new Date(form.data_hora).toISOString(),
      local: form.local,
      observacao: form.observacao,
      criado_por: autorTipo,
      status: autorTipo === 'consultor' ? 'confirmado' : 'solicitado',
    }])

    setSalvando(false)

    if (!error) {
      setForm({ data_hora: '', local: '', observacao: '', proposta_id: '' })
      setMostrarForm(false)
      carregar()
    }
  }

  async function mudarStatus(id, novoStatus) {
    await supabase.from('agendamentos').update({ status: novoStatus }).eq('id', id)
    carregar()
  }

  function nomeVeiculo(ag) {
    if (!ag.propostas) return null
    if (ag.propostas.veiculos) return `${ag.propostas.veiculos.marca} ${ag.propostas.veiculos.modelo}`
    return `${ag.propostas.marca_externa || ''} ${ag.propostas.modelo_externa || ''}`.trim() || null
  }

  if (carregando) return null

  return (
    <div>
      {(podeGerenciar || true) && (
        <div className="mb-5">
          {!mostrarForm ? (
            <button
              onClick={() => setMostrarForm(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-full transition"
            >
              + {podeGerenciar ? 'Agendar test drive' : 'Solicitar test drive'}
            </button>
          ) : (
            <form onSubmit={criarAgendamento} className="bg-blue-50/50 rounded-xl p-4 space-y-3">
              {podeGerenciar && propostas.length > 0 && (
                <select
                  value={form.proposta_id}
                  onChange={(e) => setForm({ ...form, proposta_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
                >
                  <option value="">Veículo (opcional)</option>
                  {propostas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.veiculos ? `${p.veiculos.marca} ${p.veiculos.modelo}` : `${p.marca_externa} ${p.modelo_externa}`}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="datetime-local"
                required
                value={form.data_hora}
                onChange={(e) => setForm({ ...form, data_hora: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
              <input
                type="text"
                placeholder="Local (opcional)"
                value={form.local}
                onChange={(e) => setForm({ ...form, local: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
              />
              <textarea
                placeholder="Observação (opcional)"
                rows={2}
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={salvando} className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-full hover:bg-blue-700 transition disabled:opacity-50">
                  {salvando ? 'Salvando...' : 'Confirmar'}
                </button>
                <button type="button" onClick={() => setMostrarForm(false)} className="text-xs font-semibold text-gray-500 px-3 py-1.5">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {agendamentos.length === 0 ? (
        <p className="text-gray-400 text-sm">Nenhum agendamento ainda.</p>
      ) : (
        <div className="space-y-3">
          {agendamentos.map((ag) => (
            <div key={ag.id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-semibold text-blue-950">
                    {new Date(ag.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {' às '}
                    {new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {nomeVeiculo(ag) && <p className="text-xs text-gray-500">{nomeVeiculo(ag)}</p>}
                  {ag.local && <p className="text-xs text-gray-400">{ag.local}</p>}
                </div>
                <span className={`text-xs font-mono px-2.5 py-1 rounded-full shrink-0 ${STATUS_COR[ag.status]}`}>
                  {STATUS_LABEL[ag.status]}
                </span>
              </div>

              {ag.observacao && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mt-2">{ag.observacao}</p>
              )}

              {podeGerenciar && ag.status !== 'cancelado' && ag.status !== 'concluido' && (
                <div className="flex gap-2 mt-3">
                  {ag.status === 'solicitado' && (
                    <button onClick={() => mudarStatus(ag.id, 'confirmado')} className="text-xs font-semibold bg-green-50 text-green-700 px-3 py-1 rounded-full hover:bg-green-100 transition">
                      Confirmar
                    </button>
                  )}
                  {ag.status === 'confirmado' && (
                    <button onClick={() => mudarStatus(ag.id, 'concluido')} className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100 transition">
                      Marcar como concluído
                    </button>
                  )}
                  <button onClick={() => mudarStatus(ag.id, 'cancelado')} className="text-xs font-semibold bg-red-50 text-red-600 px-3 py-1 rounded-full hover:bg-red-100 transition">
                    Cancelar
                  </button>
                </div>
              )}

              {!podeGerenciar && ag.status === 'solicitado' && (
                <button onClick={() => mudarStatus(ag.id, 'cancelado')} className="text-xs font-semibold text-red-500 hover:text-red-700 mt-3">
                  Cancelar solicitação
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}