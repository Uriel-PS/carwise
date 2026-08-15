'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const STATUS_LABEL = {
  solicitado: 'Aguardando confirmação',
  confirmado: 'Confirmado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const STATUS_COR = {
  solicitado: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmado: 'bg-green-50 text-green-700 border-green-200',
  concluido: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelado: 'bg-red-50 text-red-500 border-red-200',
}

export default function AgendaConsultor() {
  const router = useRouter()
  const [consultor, setConsultor] = useState(null)
  const [agendamentos, setAgendamentos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('ativos')

  useEffect(() => {
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/consultor/login'); return }

      const user = sessionData.session.user

      const { data: consultorData } = await supabase
        .from('consultores')
        .select('*')
        .eq('auth_id', user.id)
        .eq('ativo', true)
        .maybeSingle()

      if (!consultorData) { router.push('/consultor/login'); return }
      setConsultor(consultorData)

      const { data: agendamentosData } = await supabase
        .from('agendamentos')
        .select(`
          *,
          clientes!inner ( id, nome, telefone, consultor_id ),
          propostas ( veiculos ( marca, modelo ), marca_externa, modelo_externa )
        `)
        .eq('clientes.consultor_id', consultorData.id)
        .order('data_hora', { ascending: true })

      setAgendamentos(agendamentosData || [])
      setCarregando(false)
    }
    carregar()
  }, [router])

  async function mudarStatus(id, novoStatus) {
    await supabase.from('agendamentos').update({ status: novoStatus }).eq('id', id)
    setAgendamentos(agendamentos.map((a) => a.id === id ? { ...a, status: novoStatus } : a))
  }

  function nomeVeiculo(ag) {
    if (!ag.propostas) return null
    if (ag.propostas.veiculos) return `${ag.propostas.veiculos.marca} ${ag.propostas.veiculos.modelo}`
    return `${ag.propostas.marca_externa || ''} ${ag.propostas.modelo_externa || ''}`.trim() || null
  }

  const agendamentosFiltrados = agendamentos.filter((a) => {
    if (filtroStatus === 'ativos') return a.status === 'solicitado' || a.status === 'confirmado'
    if (filtroStatus === 'todos') return true
    return a.status === filtroStatus
  })

  const porDia = {}
  agendamentosFiltrados.forEach((ag) => {
    const dia = new Date(ag.data_hora).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    if (!porDia[dia]) porDia[dia] = []
    porDia[dia].push(ag)
  })

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-[900px] mx-auto">
        <h1 className="font-bold text-2xl text-slate-900 mb-1">Minha Agenda</h1>
        <p className="text-slate-400 text-sm mb-6">Test drives dos seus clientes, organizados por data</p>

        <div className="flex gap-2 mb-6 flex-wrap">
          {['ativos', 'solicitado', 'confirmado', 'concluido', 'cancelado', 'todos'].map((f) => (
            <button
              key={f}
              onClick={() => setFiltroStatus(f)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition capitalize ${filtroStatus === f ? 'bg-blue-950 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {Object.keys(porDia).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-14 text-center text-gray-400 text-sm">
            Nenhum agendamento nesse filtro.
          </div>
        ) : (
          Object.entries(porDia).map(([dia, agsNoDia]) => (
            <div key={dia} className="mb-6">
              <p className="text-xs font-mono text-blue-600 uppercase tracking-widest mb-3 capitalize">{dia}</p>
              <div className="space-y-3">
                {agsNoDia.map((ag) => (
                  <div key={ag.id} className={`bg-white rounded-2xl shadow-sm border p-5 ${STATUS_COR[ag.status]}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-blue-950">
                          {new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {' — '}{ag.clientes?.nome}
                        </p>
                        {nomeVeiculo(ag) && <p className="text-sm text-gray-600">{nomeVeiculo(ag)}</p>}
                        {ag.clientes?.telefone && <p className="text-xs text-gray-400">{ag.clientes.telefone}</p>}
                        {ag.local && <p className="text-xs text-gray-400">{ag.local}</p>}
                      </div>
                      <span className={`text-xs font-mono px-2.5 py-1 rounded-full shrink-0 border ${STATUS_COR[ag.status]}`}>
                        {STATUS_LABEL[ag.status]}
                      </span>
                    </div>

                    {ag.observacao && (
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mt-2">{ag.observacao}</p>
                    )}

                    {(ag.status === 'solicitado' || ag.status === 'confirmado') && (
                      <div className="flex gap-2 mt-3">
                        {ag.status === 'solicitado' && (
                          <button onClick={() => mudarStatus(ag.id, 'confirmado')} className="text-xs font-semibold bg-green-600 text-white px-3 py-1.5 rounded-full hover:bg-green-700 transition">
                            Confirmar
                          </button>
                        )}
                        {ag.status === 'confirmado' && (
                          <button onClick={() => mudarStatus(ag.id, 'concluido')} className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-full hover:bg-blue-700 transition">
                            Marcar como concluído
                          </button>
                        )}
                        <a href={`/consultor/cliente/${ag.clientes?.id}`} className="text-xs font-semibold text-gray-500 hover:text-blue-600 px-3 py-1.5">
                          Ver cliente →
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
  )
}