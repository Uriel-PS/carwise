'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const ETAPAS_PIPELINE = [
  { key: 'novos', label: 'Novos', icone: '🆕', cor: 'emerald' },
  { key: 'entrevista', label: 'Entrevista', icone: '📞', cor: 'cyan' },
  { key: 'perfil_definido', label: 'Perfil Definido', icone: '👤', cor: 'blue' },
  { key: 'buscando', label: 'Buscando Veículos', icone: '🔍', cor: 'indigo' },
  { key: 'veiculos_selecionados', label: 'Veículos Selecionados', icone: '🚙', cor: 'violet' },
  { key: 'negociando', label: 'Negociação', icone: '🤝', cor: 'amber' },
  { key: 'vistoria', label: 'Vistoria', icone: '🔧', cor: 'orange' },
  { key: 'test_drive', label: 'Test Drive', icone: '🚗', cor: 'pink' },
  { key: 'proposta', label: 'Proposta', icone: '📝', cor: 'rose' },
  { key: 'documentacao', label: 'Documentação', icone: '📋', cor: 'purple' },
  { key: 'compra_concluida', label: 'Compra Concluída', icone: '✅', cor: 'green' },
  { key: 'pos_venda', label: 'Pós-Venda', icone: '⭐', cor: 'teal' },
]

export default function PipelineConsultor() {
  const router = useRouter()
  const [consultor, setConsultor] = useState(null)
  const [clientes, setClientes] = useState([])
  const [propostas, setPropostas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [draggedClient, setDraggedClient] = useState(null)
  const [dragOverEtapa, setDragOverEtapa] = useState(null)
  const [modalConfirm, setModalConfirm] = useState(null)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [moverModal, setMoverModal] = useState(null) // { cliente, etapaAtual }

  const carregar = useCallback(async () => {
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

    const { data: clientesData } = await supabase
      .from('clientes')
      .select('id, nome, email, telefone, cidade, etapa_atual, etapa_pipeline, proxima_acao, proxima_acao_prazo, created_at, consultor_id')
      .eq('consultor_id', consultorData.id)
      .order('created_at', { ascending: false })

    setClientes(clientesData || [])

    // Load proposals
    const clienteIds = (clientesData || []).map(c => c.id)
    if (clienteIds.length > 0) {
      const { data: propostasData } = await supabase
        .from('propostas')
        .select('*, veiculos ( marca, modelo, versao, preco, concessionarias ( nome_fantasia ) )')
        .in('cliente_id', clienteIds)
        .order('created_at', { ascending: false })

      setPropostas(propostasData || [])
    }

    setCarregando(false)
  }, [router])

  useEffect(() => {
    carregar()
  }, [carregar])

  // --- Drag & Drop ---
  function handleDragStart(e, cliente) {
    setDraggedClient(cliente)
    e.dataTransfer.effectAllowed = 'move'
    // Add visual drag feedback
    const el = e.currentTarget
    setTimeout(() => el.style.opacity = '0.4', 0)
  }

  function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1'
    setDraggedClient(null)
    setDragOverEtapa(null)
  }

  function handleDragOver(e, etapaKey) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverEtapa(etapaKey)
  }

  function handleDragLeave() {
    setDragOverEtapa(null)
  }

  function handleDrop(e, novaEtapa) {
    e.preventDefault()
    setDragOverEtapa(null)

    if (!draggedClient) return

    const etapaAtual = draggedClient.etapa_pipeline || draggedClient.etapa_atual || 'novos'
    if (etapaAtual === novaEtapa) return

    // Show confirmation modal
    setModalConfirm({
      cliente: draggedClient,
      etapaAnterior: etapaAtual,
      novaEtapa,
    })
  }

  function moverClienteTouch(cliente, novaEtapa) {
    const etapaAtual = cliente.etapa_pipeline || cliente.etapa_atual || 'novos'
    if (etapaAtual === novaEtapa) return

    setModalConfirm({
      cliente,
      etapaAnterior: etapaAtual,
      novaEtapa,
    })
  }

  async function confirmarMudancaEtapa() {
    if (!modalConfirm || !consultor) return

    const { cliente, etapaAnterior, novaEtapa } = modalConfirm

    // Update client pipeline stage
    const { error } = await supabase
      .from('clientes')
      .update({ etapa_pipeline: novaEtapa, etapa_atual: novaEtapa })
      .eq('id', cliente.id)

    if (error) {
      alert('Erro ao mover cliente: ' + error.message)
      setModalConfirm(null)
      return
    }

    // Record in history
    await supabase.from('historico_negociacao').insert([{
      cliente_id: cliente.id,
      autor_tipo: 'consultor',
      autor_nome: consultor.nome,
      evento: `pipeline_${novaEtapa}`,
      observacao: `Etapa alterada de "${etapaAnterior}" para "${novaEtapa}"`,
    }])

    // Automatic commission generation
    if (novaEtapa === 'compra_concluida' || novaEtapa === 'pos_venda') {
      const props = propostas.filter(p => p.cliente_id === cliente.id && p.status === 'aceita')
      const proposta = props.length > 0 ? props[0] : null
      
      if (proposta) {
        const preco = proposta.preco_negociado
          ? proposta.preco_negociado
          : (proposta.origem === 'estoque' ? proposta.veiculos?.preco : proposta.preco_externa)

        if (preco && Number(preco) > 0) {
          const valorVenda = Number(preco)
          const valorComissao = valorVenda * 0.01

          // Check if it already exists to avoid duplicates
          const { data: existente } = await supabase
            .from('comissoes')
            .select('id')
            .eq('cliente_id', cliente.id)
            .eq('proposta_id', proposta.id)
            .maybeSingle()

          if (!existente) {
            await supabase.from('comissoes').insert([{
              consultor_id: consultor.id,
              cliente_id: cliente.id,
              proposta_id: proposta.id,
              valor: valorComissao,
              percentual: 1.00,
              valor_venda: valorVenda,
              status: 'pendente',
              observacao: 'Gerada automaticamente ao concluir a compra no Kanban.'
            }])

            // Notificar consultor sobre a nova comissão
            await supabase.from('notificacoes_consultor').insert([{
              consultor_id: consultor.id,
              tipo: 'comissao',
              titulo: 'Nova comissão gerada!',
              mensagem: `A venda para ${cliente.nome || 'o cliente'} foi concluída e sua comissão está pendente de aprovação.`,
              lida: false
            }])

            // Notificar o admin sobre a nova comissão pendente
            fetch('/api/enviar-notificacao-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                destino: 'admin',
                tipo: 'comissao',
                titulo: 'Nova comissão pendente',
                mensagem: `O consultor ${consultor.nome} concluiu uma venda e gerou uma comissão no valor de R$${valorComissao}.`,
                link: '/admin/comissoes',
                importancia: 'normal',
              }),
            }).catch(() => {})
          }
        }
      }
    }

    // Update local state
    setClientes(prev => prev.map(c =>
      c.id === cliente.id ? { ...c, etapa_pipeline: novaEtapa, etapa_atual: novaEtapa } : c
    ))

    setModalConfirm(null)
  }

  // Filter clients
  const clientesFiltrados = filtroTexto
    ? clientes.filter(c => c.nome?.toLowerCase().includes(filtroTexto.toLowerCase()))
    : clientes

  // Group clients by pipeline stage
  const pipeline = ETAPAS_PIPELINE.map(etapa => ({
    ...etapa,
    clientes: clientesFiltrados.filter(c => {
      const stage = c.etapa_pipeline || c.etapa_atual || 'novos'
      return stage === etapa.key
    }),
  }))

  function fmtMoeda(v) {
    if (!v) return null
    const n = Number(v)
    if (isNaN(n)) return null
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  }

  function getPropostaPrincipal(clienteId) {
    const props = propostas.filter(p => p.cliente_id === clienteId)
    if (props.length === 0) return null
    return props[0]
  }

  if (carregando) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-lg w-64" />
          <div className="flex gap-4 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-64 h-96 bg-slate-200 rounded-2xl shrink-0" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 h-[calc(100vh-60px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 shrink-0">
        <div>
          <h1 className="font-bold text-2xl text-slate-900">Pipeline de Vendas</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} · Arraste os cartões para mover entre etapas
          </p>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <input
            type="text"
            placeholder="Filtrar clientes..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            className="border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 w-60 bg-white focus:border-blue-400 focus:outline-none transition"
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-3 h-full" style={{ minWidth: `${ETAPAS_PIPELINE.length * 240}px` }}>
          {pipeline.map((etapa) => {
            const isOver = dragOverEtapa === etapa.key
            return (
              <div
                key={etapa.key}
                className={`
                  w-[230px] shrink-0 rounded-2xl flex flex-col transition-all duration-200
                  ${isOver
                    ? 'bg-blue-50 border-2 border-blue-300 border-dashed shadow-inner'
                    : 'bg-slate-100/60 border border-slate-200/50'
                  }
                `}
                onDragOver={(e) => handleDragOver(e, etapa.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, etapa.key)}
              >
                {/* Column header */}
                <div className="px-3 py-3 flex items-center justify-between shrink-0 border-b border-slate-200/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{etapa.icone}</span>
                    <span className="text-xs font-bold text-slate-700 truncate">{etapa.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getCountBadge(etapa.cor)}`}>
                    {etapa.clientes.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {etapa.clientes.length === 0 ? (
                    <div className="text-[11px] text-slate-400 text-center py-6 px-2">
                      {isOver ? '↓ Solte aqui' : 'Nenhum cliente'}
                    </div>
                  ) : (
                    etapa.clientes.map((cliente) => {
                      const proposta = getPropostaPrincipal(cliente.id)
                      const precoBase = proposta?.origem === 'estoque'
                        ? proposta?.veiculos?.preco
                        : proposta?.preco_externa
                      const preco = proposta?.preco_negociado || precoBase
                      const veiculoNome = proposta?.origem === 'estoque'
                        ? `${proposta?.veiculos?.marca || ''} ${proposta?.veiculos?.modelo || ''} ${proposta?.veiculos?.versao || ''}`.trim()
                        : proposta ? `${proposta?.marca_externa || ''} ${proposta?.modelo_externa || ''}`.trim() : null

                      const prazo = cliente.proxima_acao_prazo ? new Date(cliente.proxima_acao_prazo) : null
                      const atrasado = prazo && prazo < new Date()
                      const ehHoje = prazo && prazo.toDateString() === new Date().toDateString()

                      // Commission estimate (1% of negotiated or base vehicle price)
                      const comissaoPrevista = preco ? Number(preco) * 0.01 : null

                      return (
                        <div
                          key={cliente.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, cliente)}
                          onDragEnd={handleDragEnd}
                          onClick={() => router.push(`/consultor/cliente/${cliente.id}`)}
                          className="bg-white rounded-xl p-3 shadow-sm border border-slate-200/70 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-200 transition-all group"
                        >
                          {/* Client name */}
                          <p className="text-sm font-semibold text-slate-800 truncate mb-1">{cliente.nome}</p>

                          {/* Vehicle */}
                          {veiculoNome && (
                            <p className="text-xs text-slate-500 truncate flex items-center gap-1 mb-1">
                              <span>🚙</span> {veiculoNome}
                            </p>
                          )}

                          {/* Price */}
                          {preco && (
                            <div className="flex items-center gap-1.5 mb-2">
                              {proposta?.preco_negociado && precoBase ? (
                                <>
                                  <p className="text-[10px] text-slate-400 line-through">{fmtMoeda(precoBase)}</p>
                                  <p className="text-xs font-semibold text-emerald-600">{fmtMoeda(preco)}</p>
                                </>
                              ) : (
                                <p className="text-xs font-semibold text-slate-700">{fmtMoeda(preco)}</p>
                              )}
                            </div>
                          )}

                          {/* Next action */}
                          {cliente.proxima_acao && (
                            <div className={`text-[10px] px-2 py-1.5 rounded-lg mb-2 ${
                              atrasado ? 'bg-red-50 text-red-700' : ehHoje ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'
                            }`}>
                              <span className="font-semibold">Próx:</span> {cliente.proxima_acao}
                              {prazo && (
                                <span className="ml-1 font-semibold">
                                  · {ehHoje ? 'Hoje' : atrasado ? 'Atrasado' : prazo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Commission */}
                          {comissaoPrevista && (
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 mb-2">
                              <span>Comissão prevista</span>
                              <span className="font-semibold text-emerald-600">{fmtMoeda(comissaoPrevista)}</span>
                            </div>
                          )}

                          {/* Mover (Mobile/Touch) */}
                          <div className="mt-2 pt-2 border-t border-slate-100 lg:hidden" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setMoverModal({ cliente, etapaAtual: cliente.etapa_pipeline || cliente.etapa_atual || 'novos' })}
                              className="w-full flex items-center justify-between text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg px-3 py-2.5 transition"
                            >
                              <span>Mover de etapa</span>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom Sheet - Move Stage (Mobile) */}
      {moverModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={() => setMoverModal(null)}
        >
          <div
            className="bg-white rounded-t-2xl shadow-2xl w-full max-w-lg animate-in"
            style={{ maxHeight: '80vh', animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Mover de etapa</h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {moverModal.cliente.nome}
              </p>
            </div>

            {/* Scrollable list of stages */}
            <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(80vh - 120px)', WebkitOverflowScrolling: 'touch' }}>
              <div className="py-2 px-3">
                {ETAPAS_PIPELINE.map((etapa) => {
                  const isAtual = etapa.key === moverModal.etapaAtual
                  return (
                    <button
                      key={etapa.key}
                      onClick={() => {
                        if (!isAtual) {
                          moverClienteTouch(moverModal.cliente, etapa.key)
                        }
                        setMoverModal(null)
                      }}
                      disabled={isAtual}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl mb-1 text-left transition-all ${
                        isAtual
                          ? 'bg-blue-50 border-2 border-blue-200 cursor-default'
                          : 'bg-white hover:bg-slate-50 active:bg-slate-100 border border-transparent'
                      }`}
                    >
                      <span className="text-lg shrink-0">{etapa.icone}</span>
                      <span className={`text-sm font-semibold flex-1 ${isAtual ? 'text-blue-700' : 'text-slate-700'}`}>
                        {etapa.label}
                      </span>
                      {isAtual && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                          Atual
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cancel button */}
            <div className="px-5 py-4 border-t border-slate-100">
              <button
                onClick={() => setMoverModal(null)}
                className="w-full text-sm font-semibold text-slate-500 hover:text-slate-700 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {modalConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in">
            <h3 className="font-bold text-lg text-slate-900 mb-3">Confirmar mudança de etapa?</h3>
            <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-2">
              <p className="text-sm text-slate-600">
                <span className="font-semibold">{modalConfirm.cliente.nome}</span>
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400 font-mono text-xs px-2 py-0.5 rounded bg-slate-200">
                  {ETAPAS_PIPELINE.find(e => e.key === modalConfirm.etapaAnterior)?.label || modalConfirm.etapaAnterior}
                </span>
                <span className="text-slate-400">→</span>
                <span className="text-blue-700 font-mono text-xs px-2 py-0.5 rounded bg-blue-100 font-semibold">
                  {ETAPAS_PIPELINE.find(e => e.key === modalConfirm.novaEtapa)?.label || modalConfirm.novaEtapa}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Esta mudança será registrada no histórico com data, horário e seu nome.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setModalConfirm(null)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700 px-4 py-2.5 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarMudancaEtapa}
                className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition shadow-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getCountBadge(cor) {
  const map = {
    emerald: 'bg-emerald-100 text-emerald-700',
    cyan: 'bg-cyan-100 text-cyan-700',
    blue: 'bg-blue-100 text-blue-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-700',
    orange: 'bg-orange-100 text-orange-700',
    pink: 'bg-pink-100 text-pink-700',
    rose: 'bg-rose-100 text-rose-700',
    purple: 'bg-purple-100 text-purple-700',
    green: 'bg-green-100 text-green-700',
    teal: 'bg-teal-100 text-teal-700',
  }
  return map[cor] || 'bg-slate-100 text-slate-600'
}
