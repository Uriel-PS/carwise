'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import StatusConsultoria from '../components/StatusConsultoria'
import DocumentosCliente from '../components/DocumentosCliente'
import FaqInterativo from '../components/FaqInterativo'
import HistoricoNegociacao from '../components/HistoricoNegociacao'
import Agendamentos from '../components/Agendamentos'
import Pagamentos from '../components/Pagamentos'
import BloqueioPlano from '../components/BloqueioPlano'
import Contratos from '../components/Contratos'
import ChatFlutuante from '../components/ChatFlutuante'
import MenuPerfil from '../components/MenuPerfil'

export default function Painel() {
  const router = useRouter()
  const [usuario, setUsuario] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [naoLidas, setNaoLidas] = useState(0)
  const [propostas, setPropostas] = useState([])
  const [temPlanoAtivo, setTemPlanoAtivo] = useState(false)
  const [nomePlano, setNomePlano] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarDados() {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        router.push('/login')
        return
      }

      const user = sessionData.session.user
      setUsuario(user)

      const { data: perfilData, error: perfilError } = await supabase
        .from('clientes')
        .select('*')
        .eq('auth_id', user.id)
        .single()

      if (perfilError) {
        setErro('Esta conta não é de cliente. Se você é consultor, admin ou concessionária, saia e acesse o painel correspondente.')
        setCarregando(false)
        return
      }

      setPerfil(perfilData)
      const clienteId = perfilData.id

      const { count } = await supabase
        .from('mensagens_chat')
        .select('*', { count: 'exact', head: true })
        .eq('cliente_id', clienteId)
        .eq('autor_tipo', 'consultor')
        .eq('lida', false)

      setNaoLidas(count || 0)

      const { data: propostasData } = await supabase
        .from('propostas')
        .select('*, veiculos ( marca, modelo, versao, ano_fabricacao, ano_modelo, preco, concessionarias ( nome_fantasia ) )')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })

      const sortedPropostas = (propostasData || []).sort((a, b) => {
        const prioridade = { aceita: 1, apresentada: 2, recusada: 3 }
        return (prioridade[a.status] || 99) - (prioridade[b.status] || 99)
      })

      setPropostas(sortedPropostas)

      const { data: pagamentoConfirmado } = await supabase
        .from('pagamentos')
        .select('id, plano')
        .eq('cliente_id', clienteId)
        .eq('status', 'confirmado')
        .maybeSingle()

      setTemPlanoAtivo(!!pagamentoConfirmado)
      if (pagamentoConfirmado?.plano) setNomePlano(pagamentoConfirmado.plano)

      setCarregando(false)
    }

    carregarDados()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function reagirProposta(id, novoStatus) {
    await supabase.from('propostas').update({ status: novoStatus }).eq('id', id)
    setPropostas(propostas.map((p) => (p.id === id ? { ...p, status: novoStatus } : p)))

    if (novoStatus === 'aceita') {
      const proposta = propostas.find((p) => p.id === id)
      if (proposta) {
        const precoAnunciado = proposta.origem === 'estoque' ? proposta.veiculos?.preco : proposta.preco_externa
        const precoNegociado = proposta.preco_negociado || precoAnunciado

        if (precoAnunciado && precoNegociado && Number(precoAnunciado) > Number(precoNegociado)) {
          // Generate economy record
          await supabase.from('economia_gerada').insert([{
            consultor_id: perfil.consultor_id,
            cliente_id: perfil.id,
            proposta_id: proposta.id,
            preco_anunciado: Number(precoAnunciado),
            preco_negociado: Number(precoNegociado)
          }])
        }
      }
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white/90 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-xl text-blue-950">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            CarWise
          </a>
          <MenuPerfil nome={perfil?.nome || usuario?.email} onLogout={handleLogout} />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">

        <div className="bg-white rounded-2xl shadow-[0_20px_50px_-24px_rgba(10,34,71,0.15)] border border-gray-50 p-8 mb-5 relative">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-mono text-blue-600 uppercase tracking-widest mb-2">Bem-vindo de volta</p>
              <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-blue-950">
                {perfil?.nome || usuario?.email}
              </h1>
            </div>
            
            {temPlanoAtivo && nomePlano && (
              <div className="bg-blue-50/80 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-blue-100 shadow-sm">
                <IconFinanceiro />
                Plano {nomePlano}
              </div>
            )}
          </div>
          
          <StatusConsultoria etapaAtual={perfil?.etapa_atual} />
        </div>

        {erro && (
          <p className="text-red-600 text-sm mb-5 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>
        )}

        {!temPlanoAtivo ? (
          <div className="grid md:grid-cols-3 gap-5">
            <div className="md:col-span-2 space-y-5">
              <div id="pagamento">
                <Secao titulo="Escolha seu plano" icon={<IconFinanceiro />}>
                  <Pagamentos clienteId={perfil.id} />
                </Secao>
              </div>
              <BloqueioPlano titulo="Propostas encontradas para você" />
              <BloqueioPlano titulo="Chat, documentos, agenda e mais" />
            </div>
            <div className="space-y-5">
              <div className="flex justify-center">
                <FaqInterativo />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            <div className="md:col-span-2 space-y-5">

              <Secao titulo="Propostas encontradas para você" icon={<IconVeiculo />}>
                {propostas.length === 0 ? (
                  <p className="text-gray-400 text-sm">Seu consultor ainda não apresentou propostas. Assim que encontrar boas opções, elas aparecem aqui.</p>
                ) : (
                  <div className="space-y-4">
                    {propostas.map((p) => {
                      const dados = p.origem === 'estoque'
                        ? {
                            marca: p.veiculos?.marca, modelo: p.veiculos?.modelo, versao: p.veiculos?.versao,
                            ano: `${p.veiculos?.ano_fabricacao}/${p.veiculos?.ano_modelo}`, preco: p.veiculos?.preco,
                            fonte: p.veiculos?.concessionarias?.nome_fantasia,
                          }
                        : {
                            marca: p.marca_externa, modelo: p.modelo_externa, versao: '',
                            ano: p.ano_externa, preco: p.preco_externa, fonte: 'Encontrado pelo seu consultor',
                          }

                      return (
                        <div key={p.id} className="border border-gray-100 rounded-xl p-5">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold text-blue-950">{dados.marca} {dados.modelo} {dados.versao}</h3>
                              <p className="text-xs text-gray-400">{dados.ano} · {dados.fonte}</p>
                            </div>
                            {dados.preco && (
                              <p className="text-gray-800 font-semibold">
                                {Number(dados.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                              </p>
                            )}
                          </div>

                          {p.observacao_externa && (
                            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-3">{p.observacao_externa}</p>
                          )}

                          {p.link_externo && (
                            <a href={p.link_externo} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block mb-3">
                              Ver anúncio original →
                            </a>
                          )}

                          {p.status === 'apresentada' ? (
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => reagirProposta(p.id, 'aceita')} className="text-xs font-semibold bg-green-50 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-100 transition">
                                ✓ Gostei
                              </button>
                              <button onClick={() => reagirProposta(p.id, 'recusada')} className="text-xs font-semibold bg-red-50 text-red-600 px-3 py-1.5 rounded-full hover:bg-red-100 transition">
                                Não é o que procuro
                              </button>
                            </div>
                          ) : (
                            <span className={`inline-block text-xs font-mono px-2.5 py-1 rounded-full mt-2 ${
                              p.status === 'aceita' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                            }`}>
                              {p.status === 'aceita' ? '✓ Você gostou desta opção' : 'Marcado como não interessante'}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Secao>

              <Secao titulo="Test drive" icon={<IconVeiculo />}>
                <Agendamentos clienteId={perfil.id} autorTipo="cliente" podeGerenciar={false} />
              </Secao>



              <Secao titulo="Histórico da negociação" icon={<IconDocumento />}>
                <HistoricoNegociacao clienteId={perfil.id} podeAdicionar={false} />
              </Secao>

              <Secao titulo="Contratos" icon={<IconDocumento />} expandivel={false}>
                <Contratos clienteId={perfil.id} podeGerar={false} nomeCliente={perfil.nome} cpfCliente={perfil.cpf} />
              </Secao>

            </div>

            <div className="space-y-5">
              <Secao titulo="Meus documentos" icon={<IconDocumento />}>
                <DocumentosCliente clienteId={perfil.id} authId={usuario.id} />
              </Secao>

              <div className="flex justify-center">
                <FaqInterativo />
              </div>
            </div>
          </div>
        )}

      </div>

      {temPlanoAtivo && perfil && usuario && (
        <ChatFlutuante
          clienteId={perfil.id}
          autorTipo="cliente"
          autorId={usuario.id}
          autorNome={perfil.nome}
          tituloChat="Seu consultor"
          subtitulo="Online"
          naoLidas={naoLidas}
        />
      )}
    </div>
  )
}

function Secao({ titulo, icon, children, expandivel = true }) {
  const [expandido, setExpandido] = useState(false)
  const [precisaExpandir, setPrecisaExpandir] = useState(false)
  const innerRef = useRef(null)

  useEffect(() => {
    if (!expandivel) return

    const el = innerRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      if (el.scrollHeight > 350) {
        setPrecisaExpandir(true)
      } else {
        setPrecisaExpandir(false)
      }
    })

    observer.observe(el)

    return () => observer.disconnect()
  }, [expandivel])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h2 className="font-[family-name:var(--font-display)] font-semibold text-blue-950 text-base">{titulo}</h2>
      </div>
      <div className="relative">
        <div
          className={`transition-all duration-300 overflow-hidden ${
            !expandivel || expandido || !precisaExpandir ? '' : 'max-h-[350px]'
          }`}
          style={expandivel && !expandido && precisaExpandir ? { maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' } : {}}
        >
          <div ref={expandivel ? innerRef : null}>
            {children}
          </div>
        </div>
        {expandivel && !expandido && precisaExpandir && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end pb-2">
            <button
              onClick={() => setExpandido(true)}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition bg-white/90 backdrop-blur border border-blue-100 shadow-sm px-5 py-2 rounded-full"
            >
              Ver mais
            </button>
          </div>
        )}
        {expandivel && expandido && precisaExpandir && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setExpandido(false)}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition bg-blue-50 px-4 py-1.5 rounded-full"
            >
              Ver menos
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function IconFinanceiro() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" stroke="#2B5FE0" strokeWidth="1.6" strokeLinejoin="round"/></svg>
}
function IconVeiculo() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 16l1.4-4.5A2 2 0 017.3 10h9.4a2 2 0 011.9 1.5L20 16" stroke="#2B5FE0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="16" width="18" height="4" rx="1.5" stroke="#2B5FE0" strokeWidth="1.6"/></svg>
}
function IconDocumento() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#2B5FE0" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 2v6h6" stroke="#2B5FE0" strokeWidth="1.6" strokeLinejoin="round"/></svg>
}