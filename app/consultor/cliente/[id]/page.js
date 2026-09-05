'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { calcularCompatibilidade } from '../../../lib/compatibilidade'
import StatusConsultoria from '../../../components/StatusConsultoria'
import DocumentosClienteLeitura from '../../../components/DocumentosClienteLeitura'
import HistoricoNegociacao from '../../../components/HistoricoNegociacao'
import Agendamentos from '../../../components/Agendamentos'
import ChatConsultor from '../../../components/ChatConsultor'
import { useCallback } from 'react'
import Contratos from '../../../components/Contratos'
import ChatFlutuante from '../../../components/ChatFlutuante'
import LaudosConsultor from '../../../components/LaudosConsultor'
import GaleriaVeiculo from '../../../components/GaleriaVeiculo'

const PRIORIDADES_LABELS = [
  ['economia', 'Economia'],
  ['conforto', 'Conforto'],
  ['tecnologia', 'Tecnologia'],
  ['espaco', 'Espaço'],
  ['potencia', 'Potência'],
  ['seguranca', 'Segurança'],
  ['baixa_manutencao', 'Baixa manutenção'],
  ['revenda_facil', 'Revenda fácil'],
  ['design', 'Design'],
  ['status', 'Status'],
]

export default function DetalheCliente() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id

  const ETAPAS_ORDEM = ['cadastro', 'buscando', 'negociando', 'documentacao', 'entrega']

  const [perfil, setPerfil] = useState(null)
  const [financeiro, setFinanceiro] = useState(null)
  const [uso, setUso] = useState(null)
  const [preferencias, setPreferencias] = useState(null)
  const [prioridades, setPrioridades] = useState(null)
  const [ranking, setRanking] = useState([])
const [qtdVisivel, setQtdVisivel] = useState(4)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
const [consultorLogado, setConsultorLogado] = useState(null)
const [propostas, setPropostas] = useState([])
  const [veiculosEstoque, setVeiculosEstoque] = useState([])
  const [mostrarFormProposta, setMostrarFormProposta] = useState(false)
  const [origemProposta, setOrigemProposta] = useState('estoque')
  const [veiculoEscolhido, setVeiculoEscolhido] = useState('')
  const [precoNegociadoEstoque, setPrecoNegociadoEstoque] = useState('')
  const [propostaExterna, setPropostaExterna] = useState({
    marca_externa: '', modelo_externa: '', ano_externa: '', preco_externa: '', observacao_externa: '', link_externo: '',
  })
  const [fotosExternas, setFotosExternas] = useState([])
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [salvandoProposta, setSalvandoProposta] = useState(false)

  useEffect(() => {
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        router.push('/consultor/login')
        return
      }

      const user = sessionData.session.user

      const { data: consultorData } = await supabase
        .from('consultores')
        .select('*')
        .eq('auth_id', user.id)
        .eq('ativo', true)
        .maybeSingle()

      if (!consultorData) {
        router.push('/consultor/login')
        return
      }

      setConsultorLogado(consultorData)

      const { data: perfilData, error: perfilError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single()

      if (perfilError) {
        setErro('Cliente não encontrado.')
        setCarregando(false)
        return
      }

      setPerfil(perfilData)

      try {
        const recent = JSON.parse(localStorage.getItem('recent_clients_consultor') || '[]')
        const filteredRecent = recent.filter(item => (typeof item === 'object' ? item.id : item) !== clienteId)
        const updatedRecent = [{ id: clienteId, timestamp: new Date().toISOString() }, ...filteredRecent].slice(0, 50)
        localStorage.setItem('recent_clients_consultor', JSON.stringify(updatedRecent))
      } catch (e) {}

      const [rFin, rUso, rPref, rPrio] = await Promise.all([
        supabase.from('clientes_financeiro').select('*').eq('cliente_id', clienteId).maybeSingle(),
        supabase.from('clientes_uso').select('*').eq('cliente_id', clienteId).maybeSingle(),
        supabase.from('clientes_preferencias').select('*').eq('cliente_id', clienteId).maybeSingle(),
        supabase.from('clientes_prioridades').select('*').eq('cliente_id', clienteId).maybeSingle(),
      ])

      setFinanceiro(rFin.data)
      setUso(rUso.data)
      setPreferencias(rPref.data)
      setPrioridades(rPrio.data)

      const { data: veiculosData, error: veiculosError } = await supabase
        .from('veiculos')
        .select(`
          id, marca, modelo, versao, ano_fabricacao, ano_modelo, cor, cambio,
          combustivel, categoria, km, preco, preco_negociacao, status,
          concessionarias ( nome_fantasia, cidade, estado ),
          veiculo_fotos (id, url, ordem)
        `)
        .eq('status', 'ativo')

      if (!veiculosError && veiculosData) {
        const clienteParaCalculo = {
          preferencias: rPref.data || {},
          prioridades: rPrio.data || {},
        }

        const rankingCalculado = veiculosData
          .map((v) => ({
            veiculo: v,
            ...calcularCompatibilidade(clienteParaCalculo, v),
          }))
          .sort((a, b) => b.percentual - a.percentual)

        setRanking(rankingCalculado)
        setVeiculosEstoque(veiculosData)
      }

      const { data: propostasData } = await supabase
        .from('propostas')
        .select('*, veiculos ( marca, modelo, versao, ano_fabricacao, ano_modelo, preco, concessionarias ( nome_fantasia ), veiculo_fotos(id, url, ordem) )')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })

      setPropostas(propostasData || [])

      setCarregando(false)
    }

    carregar()
  }, [router, clienteId])

  async function mudarEtapa(novaEtapa) {
    if (perfil?.etapa_atual === novaEtapa) return // evita evento duplicado

    const { error } = await supabase
      .from('clientes')
      .update({ etapa_atual: novaEtapa })
      .eq('id', clienteId)

    if (!error) {
      setPerfil({ ...perfil, etapa_atual: novaEtapa })

      const { data: sessionData } = await supabase.auth.getSession()
      const { data: consultorData } = await supabase
        .from('consultores').select('nome').eq('auth_id', sessionData.session.user.id).maybeSingle()

      await supabase.from('historico_negociacao').insert([{
        cliente_id: clienteId,
        autor_tipo: 'consultor',
        autor_nome: consultorData?.nome || 'Consultor',
        evento: novaEtapa,
      }])
    }
  }

  async function carregarPropostas() {
    const { data } = await supabase
      .from('propostas')
      .select('*, veiculos ( marca, modelo, versao, ano_fabricacao, ano_modelo, preco, concessionarias ( nome_fantasia ), veiculo_fotos(id, url, ordem) )')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
    setPropostas(data || [])
  }

  async function handleUploadFoto(e) {
    if (!e.target.files || e.target.files.length === 0) return
    if (fotosExternas.length >= 4) {
      alert('Máximo de 4 fotos atingido.')
      return
    }

    setUploadingFoto(true)

    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload-foto', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erro no upload')

      setFotosExternas([...fotosExternas, { url: data.url }])
    } catch (err) {
      alert(err.message)
    } finally {
      setUploadingFoto(false)
      e.target.value = ''
    }
  }

  function removerFoto(index) {
    setFotosExternas(fotosExternas.filter((_, i) => i !== index))
  }

  async function criarProposta(e) {
    e.preventDefault()
    setSalvandoProposta(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const authId = sessionData.session.user.id

    const dados = origemProposta === 'estoque'
      ? {
          cliente_id: clienteId,
          veiculo_id: veiculoEscolhido,
          preco_negociado: precoNegociadoEstoque ? Number(precoNegociadoEstoque) : null,
          origem: 'estoque',
          criado_por: authId,
        }
      : {
          cliente_id: clienteId,
          origem: 'externa',
          criado_por: authId,
          marca_externa: propostaExterna.marca_externa,
          modelo_externa: propostaExterna.modelo_externa,
          ano_externa: propostaExterna.ano_externa,
          preco_externa: propostaExterna.preco_externa || null,
          observacao_externa: propostaExterna.observacao_externa,
          link_externo: propostaExterna.link_externo,
          fotos_externas: fotosExternas,
        }

    const { error } = await supabase.from('propostas').insert([dados])

    setSalvandoProposta(false)

    if (!error) {
      // Descobrir nome do veículo
      const v = veiculos.find(veiculo => veiculo.id === veiculoEscolhido)
      const nomeVeiculo = tipoProposta === 'estoque' && v
        ? `${v.marca} ${v.modelo}`
        : tipoProposta === 'externa'
          ? `${propostaExterna.marca_externa} ${propostaExterna.modelo_externa}`
          : 'um veículo'

      // Enviar notificação e-mail para o cliente
      fetch('/api/enviar-notificacao-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destino: 'cliente',
          destino_id: clienteId,
          tipo: 'proposta',
          titulo: 'Seu consultor enviou uma nova proposta!',
          mensagem: `Separei uma nova opção para você analisar: ${nomeVeiculo}. Acesse seu painel para conferir os detalhes e me dizer o que achou.`,
          link: '/painel',
          importancia: 'alta',
        }),
      }).catch(() => {})

      setMostrarFormProposta(false)
      setVeiculoEscolhido('')
      setPrecoNegociadoEstoque('')
      setPropostaExterna({ marca_externa: '', modelo_externa: '', ano_externa: '', preco_externa: '', observacao_externa: '', link_externo: '' })
      setFotosExternas([])
      carregarPropostas()
    } else {
      alert('Erro ao apresentar proposta: ' + error.message)
    }
  }

  async function removerProposta(id) {
    if (!confirm('Remover esta proposta?')) return
    await supabase.from('propostas').delete().eq('id', id)
    carregarPropostas()
  }

  function exportarTXT() {
    if (!perfil) return

    const fmt = (v) => {
      if (v === null || v === undefined || v === '') return '—'
      return String(v)
    }
    const fmtMoeda = (v) => {
      if (!v) return '—'
      const n = Number(v)
      if (isNaN(n)) return fmt(v)
      return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    }
    const fmtData = (d) => {
      if (!d) return '—'
      const [ano, mes, dia] = d.split('-')
      return `${dia}/${mes}/${ano}`
    }

    let c = `════════════════════════════════════════════════════════\n`
    c += `  DOSSIÊ COMPLETO DO CLIENTE\n`
    c += `  ${perfil.nome}\n`
    c += `  Gerado em: ${new Date().toLocaleString('pt-BR')}\n`
    c += `════════════════════════════════════════════════════════\n\n`

    // --- DADOS PESSOAIS ---
    c += `── DADOS PESSOAIS ─────────────────────────────────────\n`
    c += `  Nome completo:      ${fmt(perfil.nome)}\n`
    c += `  CPF:                ${fmt(perfil.cpf)}\n`
    c += `  Data de nascimento: ${fmtData(perfil.data_nascimento)}\n`
    c += `  E-mail:             ${fmt(perfil.email)}\n`
    c += `  Telefone:           ${fmt(perfil.telefone)}\n`
    c += `  Estado civil:       ${fmt(perfil.estado_civil)}\n`
    c += `  Profissão:          ${fmt(perfil.profissao)}\n`
    c += `  Local de trabalho:  ${fmt(perfil.empresa)}\n`
    c += `  Cidade / UF:        ${perfil.cidade && perfil.estado ? `${perfil.cidade} / ${perfil.estado}` : '—'}\n`
    c += `  Cliente desde:      ${perfil.created_at ? new Date(perfil.created_at).toLocaleDateString('pt-BR') : '—'}\n`
    c += `\n`

    // --- DADOS FINANCEIROS ---
    if (financeiro) {
      c += `── DADOS FINANCEIROS ──────────────────────────────────\n`
      c += `  Renda mensal:       ${fmtMoeda(financeiro.renda_mensal)}\n`
      c += `  Renda familiar:     ${fmtMoeda(financeiro.renda_familiar)}\n`
      c += `  Entrada:            ${fmtMoeda(financeiro.entrada)}\n`
      c += `  Parcela máxima:     ${fmtMoeda(financeiro.parcela_maxima)}\n`
      c += `  Prazo máximo:       ${financeiro.prazo_meses ? `${financeiro.prazo_meses} meses` : '—'}\n`
      c += `  Forma de pagamento: ${fmt(financeiro.forma_pagamento)}\n`
      c += `  Veículo para troca: ${financeiro.tem_veiculo_troca ? `Sim — ${fmtMoeda(financeiro.valor_veiculo_troca) || 'valor não informado'}` : 'Não'}\n`
      c += `  Restrição no nome:  ${financeiro.tem_restricao ? 'Sim' : 'Não'}\n`
      c += `  Banco preferência:  ${fmt(financeiro.banco_preferencia)}\n`
      c += `  Autoriza análise:   ${financeiro.autoriza_analise_financiamento ? '✓ Sim, autorizado' : 'Não autorizado'}\n`
      c += `\n`
    }

    // --- PERFIL DE USO ---
    if (uso) {
      c += `── PERFIL DE USO ──────────────────────────────────────\n`
      c += `  Uso principal:        ${fmt(uso.uso_principal)}\n`
      c += `  Pessoas no carro:     ${fmt(uso.pessoas_no_carro)}\n`
      c += `  Percurso diário:      ${fmt(uso.percurso_diario)}\n`
      c += `  Frequência de viagens: ${fmt(uso.frequencia_viagens)}\n`
      c += `\n`
    }

    // --- PREFERÊNCIAS DO VEÍCULO ---
    if (preferencias) {
      c += `── PREFERÊNCIAS DO VEÍCULO ────────────────────────────\n`
      c += `  Categoria:           ${fmt(preferencias.categoria)}\n`
      const faixaPreco = preferencias.preco_min && preferencias.preco_max
        ? `${fmtMoeda(preferencias.preco_min)} — ${fmtMoeda(preferencias.preco_max)}`
        : preferencias.preco_min ? `A partir de ${fmtMoeda(preferencias.preco_min)}`
        : preferencias.preco_max ? `Até ${fmtMoeda(preferencias.preco_max)}` : '—'
      c += `  Faixa de preço:      ${faixaPreco}\n`
      const faixaAno = preferencias.ano_min && preferencias.ano_max
        ? `${preferencias.ano_min} — ${preferencias.ano_max}`
        : preferencias.ano_min ? `A partir de ${preferencias.ano_min}`
        : preferencias.ano_max ? `Até ${preferencias.ano_max}` : '—'
      c += `  Faixa de ano:        ${faixaAno}\n`
      c += `  Km máxima:           ${preferencias.km_maxima ? `${preferencias.km_maxima} km` : '—'}\n`
      c += `  Transmissão:         ${fmt(preferencias.cambio)}\n`
      c += `  Cor desejada:        ${fmt(preferencias.cor)}\n`
      c += `  Marcas preferidas:   ${fmt(preferencias.marcas_preferidas)}\n`
      c += `  Marcas recusadas:    ${fmt(preferencias.marcas_recusadas)}\n`
      c += `\n`
    }

    // --- PRIORIDADES ---
    if (prioridades) {
      c += `── PRIORIDADES DO CLIENTE ─────────────────────────────\n`
      const LABELS = [
        ['economia', 'Economia'], ['conforto', 'Conforto'], ['tecnologia', 'Tecnologia'],
        ['espaco', 'Espaço'], ['potencia', 'Potência'], ['seguranca', 'Segurança'],
        ['baixa_manutencao', 'Baixa manutenção'], ['revenda_facil', 'Revenda fácil'],
        ['design', 'Design'], ['status', 'Status'],
      ]
      LABELS.forEach(([campo, label]) => {
        const val = prioridades[campo] ?? '—'
        const barra = typeof val === 'number' ? '█'.repeat(val) + '░'.repeat(10 - val) : ''
        c += `  ${label.padEnd(20)} ${barra} ${val}/10\n`
      })
      c += `\n`
    }

    c += `════════════════════════════════════════════════════════\n`
    c += `  Documento gerado automaticamente pelo CarWise\n`
    c += `════════════════════════════════════════════════════════\n`

    const blob = new Blob([c], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `cliente_${perfil.nome.replace(/\s+/g, '_')}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{erro}</p>
          <a href="/consultor/painel" className="text-blue-600 font-medium text-sm">← Voltar para a lista</a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <a href="/consultor/clientes" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-600 font-medium transition">
            ← Voltar para a lista
          </a>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-900 mb-1">{perfil?.nome}</h1>
            <p className="text-gray-500 text-sm">Cliente desde {new Date(perfil.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
          
          <div className="flex flex-row flex-wrap gap-2 mt-4 md:mt-0">
            <button
              onClick={() => router.push(`/consultor/cliente/${clienteId}/dados`)}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold px-3 py-2 rounded-lg transition"
            >
              Ver dados completos
            </button>
            <button
              onClick={exportarTXT}
              className="bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 text-xs font-semibold px-3 py-2 rounded-lg transition"
            >
              Exportar dados (.txt)
            </button>
            <button
              onClick={() => router.push(`/consultor/catalogo?clienteId=${clienteId}`)}
              className="bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold px-3 py-2 rounded-lg transition shadow-sm"
            >
              Comparar no catálogo
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5">
          <p className="text-xs font-mono text-blue-600 uppercase tracking-widest mb-5">Status da consultoria (visão do cliente)</p>
          <StatusConsultoria etapaAtual={perfil?.etapa_pipeline || perfil?.etapa_atual} />
          <p className="text-xs text-gray-400 mt-4">
            Este status é atualizado automaticamente pelo Pipeline. Altere a etapa no <a href="/consultor/pipeline" className="text-blue-600 hover:underline font-medium">Pipeline de Vendas</a> para refletir aqui.
          </p>
        </div>

        {ranking.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5">
            <h2 className="font-semibold text-blue-950 text-lg mb-1">Ranking de compatibilidade</h2>
            <p className="text-xs text-gray-400 mb-6">Veículos do estoque comparados ao perfil deste cliente, do mais ao menos compatível.</p>

            <SecaoExpansivel maxHeight="540px">
              <div className="space-y-4">
                {ranking.map((item, i) => (
                <div key={item.veiculo.id} className="border border-gray-100 rounded-xl p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">#{i + 1}</span>
                        <h3 className="font-semibold text-blue-950">
                          {item.veiculo.marca} {item.veiculo.modelo} {item.veiculo.versao}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.veiculo.ano_fabricacao}/{item.veiculo.ano_modelo} · {item.veiculo.km ? `${item.veiculo.km} km` : '—'} · {item.veiculo.concessionarias?.nome_fantasia}
                      </p>
                    </div>
                    <div className={`text-lg font-bold shrink-0 ${item.percentual >= 80 ? 'text-green-600' : item.percentual >= 60 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {item.percentual}%
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-3 text-sm">
                    <span className="text-gray-600 font-medium">
                      {item.veiculo.preco ? Number(item.veiculo.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—'}
                    </span>
                    {item.veiculo.preco_negociacao && (
                      <span className="text-amber-700 text-xs font-mono">
                        mín. negociação: {Number(item.veiculo.preco_negociacao).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.percentual >= 80 ? 'bg-green-500' : item.percentual >= 60 ? 'bg-amber-500' : 'bg-gray-300'}`}
                      style={{ width: `${item.percentual}%` }}
                    />
                  </div>

                  {item.motivos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {item.motivos.map((m, idx) => (
                        <span key={idx} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">✓ {m}</span>
                      ))}
                    </div>
                  )}
                  {item.atencao.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.atencao.map((a, idx) => (
                        <span key={idx} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">⚠ {a}</span>
                      ))}
                    </div>
                  )}
                </div>
                ))}
              </div>
            </SecaoExpansivel>
          </div>
        )}

        {ranking.length === 0 && !carregando && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5 text-center text-gray-400 text-sm">
            Nenhum veículo ativo no estoque para comparar ainda.
          </div>
        )}

	<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-blue-950 text-lg">Propostas apresentadas ao cliente</h2>
            <button
              onClick={() => setMostrarFormProposta(!mostrarFormProposta)}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {mostrarFormProposta ? 'Cancelar' : '+ Nova proposta'}
            </button>
          </div>

          {mostrarFormProposta && (
            <form onSubmit={criarProposta} className="bg-blue-50/50 rounded-xl p-6 mb-6 space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOrigemProposta('estoque')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${origemProposta === 'estoque' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
                >
                  Do estoque parceiro
                </button>
                <button
                  type="button"
                  onClick={() => setOrigemProposta('externa')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${origemProposta === 'externa' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
                >
                  Encontrado por fora
                </button>
              </div>

              {origemProposta === 'estoque' ? (
                <div className="space-y-3">
                  <select
                    value={veiculoEscolhido}
                    onChange={(e) => setVeiculoEscolhido(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white"
                  >
                    <option value="">Selecione um veículo do estoque</option>
                    {veiculosEstoque.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.marca} {v.modelo} {v.versao} — {v.ano_fabricacao}/{v.ano_modelo} — {Number(v.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} — {v.concessionarias?.nome_fantasia}
                      </option>
                    ))}
                  </select>

                  {veiculoEscolhido && (
                    <div className="w-1/3 aspect-video shrink-0 rounded-lg overflow-hidden border border-gray-100">
                      <GaleriaVeiculo fotos={veiculosEstoque.find(v => v.id === veiculoEscolhido)?.veiculo_fotos || []} />
                    </div>
                  )}

                  <input
                    type="number"
                    step="0.01"
                    placeholder="Preço alcançado na negociação (R$)"
                    required
                    value={precoNegociadoEstoque}
                    onChange={(e) => setPrecoNegociadoEstoque(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Marca" required value={propostaExterna.marca_externa} onChange={(e) => setPropostaExterna({ ...propostaExterna, marca_externa: e.target.value })} className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400" />
                    <input type="text" placeholder="Modelo" required value={propostaExterna.modelo_externa} onChange={(e) => setPropostaExterna({ ...propostaExterna, modelo_externa: e.target.value })} className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Ano" value={propostaExterna.ano_externa} onChange={(e) => setPropostaExterna({ ...propostaExterna, ano_externa: e.target.value })} className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400" />
                    <input type="text" placeholder="Preço" value={propostaExterna.preco_externa} onChange={(e) => setPropostaExterna({ ...propostaExterna, preco_externa: e.target.value })} className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400" />
                  </div>
                  <input type="text" placeholder="Link do anúncio (opcional)" value={propostaExterna.link_externo} onChange={(e) => setPropostaExterna({ ...propostaExterna, link_externo: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400" />
                  <textarea placeholder="Observações sobre essa opção" rows={2} value={propostaExterna.observacao_externa} onChange={(e) => setPropostaExterna({ ...propostaExterna, observacao_externa: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-none" />
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Fotos do veículo (Máx 4)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {fotosExternas.map((f, i) => (
                        <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 group bg-gray-50 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={f.url} alt={`Foto ${i+1}`} className="object-cover w-full h-full" />
                          <button type="button" onClick={() => removerFoto(i)} className="absolute top-1 right-1 bg-white/90 text-red-500 rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-white transition opacity-0 group-hover:opacity-100">
                            ×
                          </button>
                        </div>
                      ))}
                      
                      {fotosExternas.length < 4 && (
                        <label className={`relative aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${uploadingFoto ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'}`}>
                          <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleUploadFoto} disabled={uploadingFoto} />
                          {uploadingFoto ? (
                            <span className="text-xs text-blue-500 font-medium animate-pulse">Enviando...</span>
                          ) : (
                            <>
                              <span className="text-xl text-gray-400 mb-1">+</span>
                              <span className="text-xs text-gray-500 font-medium text-center px-2">Adicionar foto</span>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  </div>
                </>
              )}

              <button type="submit" disabled={salvandoProposta} className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {salvandoProposta ? 'Enviando...' : 'Apresentar proposta ao cliente'}
              </button>
            </form>
          )}

          <SecaoExpansivel maxHeight="320px">
            <div className="space-y-3">
              {propostas.map((p) => {
              const dados = p.origem === 'estoque'
                ? { marca: p.veiculos?.marca, modelo: p.veiculos?.modelo, versao: p.veiculos?.versao, ano: `${p.veiculos?.ano_fabricacao}/${p.veiculos?.ano_modelo}`, preco: p.veiculos?.preco, preco_negociado: p.preco_negociado, fonte: p.veiculos?.concessionarias?.nome_fantasia }
                : { marca: p.marca_externa, modelo: p.modelo_externa, versao: '', ano: p.ano_externa, preco: p.preco_externa, preco_negociado: null, fonte: 'Encontrado por fora' }

              const fotos = p.origem === 'estoque' ? p.veiculos?.veiculo_fotos : p.fotos_externas

              return (
                <div key={p.id} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                  {fotos && fotos.length > 0 && (
                    <div className="w-full aspect-video rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      <GaleriaVeiculo fotos={fotos} />
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-blue-950">{dados.marca} {dados.modelo} {dados.versao}</p>
                    <p className="text-xs text-gray-400">{dados.ano} · {dados.fonte}</p>
                    
                    <div className="mt-1 flex items-center gap-2">
                      {dados.preco && <p className={`text-sm ${dados.preco_negociado ? 'text-gray-400 line-through text-xs' : 'text-gray-600'}`}>{Number(dados.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</p>}
                      {dados.preco_negociado && <p className="text-sm text-green-600 font-bold">{Number(dados.preco_negociado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</p>}
                    </div>

                    <span className={`inline-block text-xs font-mono px-2 py-0.5 rounded-full mt-2 ${
                      p.status === 'aceita' ? 'bg-green-50 text-green-600' : p.status === 'recusada' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <button onClick={() => removerProposta(p.id)} className="text-xs text-red-400 hover:text-red-600">Remover</button>
                  </div>
                </div>
              )
            })}
            {propostas.length === 0 && <p className="text-gray-400 text-sm">Nenhuma proposta apresentada ainda.</p>}
            </div>
          </SecaoExpansivel>
        </div>

	<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5">
          <h2 className="font-semibold text-blue-950 text-lg mb-5">Test drive</h2>
          <SecaoExpansivel maxHeight="260px">
            <Agendamentos clienteId={clienteId} autorTipo="consultor" podeGerenciar={true} />
          </SecaoExpansivel>
        </div>

	<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5">
          <h2 className="font-semibold text-blue-950 text-lg mb-5">Contratos</h2>
          <Contratos clienteId={clienteId} podeGerar={true} nomeCliente={perfil?.nome} cpfCliente={perfil?.cpf} />
        </div>

	{perfil && (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5">
    <h2 className="font-semibold text-blue-950 text-lg mb-5">Documentos do cliente</h2>
    <DocumentosClienteLeitura clienteId={perfil.id} />
  </div>
)}

{perfil && (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5">
    <LaudosConsultor clienteId={perfil.id} />
  </div>
)}

<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5">
  <h2 className="font-semibold text-blue-950 text-lg mb-5">Histórico da negociação</h2>
  <SecaoExpansivel maxHeight="260px">
    <HistoricoNegociacao clienteId={perfil.id} podeAdicionar={true} />
  </SecaoExpansivel>
</div>

</div>
      {consultorLogado && (
        <ChatFlutuante
          clienteId={clienteId}
          autorTipo="consultor"
          autorId={consultorLogado.auth_id}
          autorNome={consultorLogado.nome}
          tituloChat={perfil?.nome}
        />
      )}
    </div>
  )
}

function Secao({ titulo, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5">
      <h2 className="font-semibold text-blue-950 text-lg mb-5">{titulo}</h2>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right">{value || '—'}</span>
    </div>
  )
}

function formatarData(data) {
  if (!data) return null
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

function formatarMoeda(valor) {
  if (!valor) return null
  const numero = Number(valor)
  if (isNaN(numero)) return valor
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function formatarFaixa(min, max, formatador) {
  const f = formatador || ((v) => v)
  if (!min && !max) return null
  if (min && max) return `${f(min)} — ${f(max)}`
  if (min) return `A partir de ${f(min)}`
  return `Até ${f(max)}`
}

function SecaoExpansivel({ children, maxHeight = '220px' }) {
  const [expandido, setExpandido] = useState(false)
  const [precisaExpandir, setPrecisaExpandir] = useState(false)
  const innerRef = useRef(null)

  useEffect(() => {
    const el = innerRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      const maxH = parseInt(maxHeight.replace('px', ''))
      if (el.scrollHeight > maxH) {
        setPrecisaExpandir(true)
      } else {
        setPrecisaExpandir(false)
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [maxHeight])

  return (
    <div className="relative">
      <div
        className={`transition-all duration-300 overflow-hidden ${
          expandido || !precisaExpandir ? '' : ''
        }`}
        style={{
          maxHeight: expandido || !precisaExpandir ? 'none' : maxHeight,
          ...( !expandido && precisaExpandir ? { maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' } : {} )
        }}
      >
        <div ref={innerRef}>
          {children}
        </div>
      </div>
      {!expandido && precisaExpandir && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end pb-0 pointer-events-none">
          <button
            onClick={() => setExpandido(true)}
            className="pointer-events-auto text-sm font-semibold text-blue-600 hover:text-blue-800 transition bg-white/90 backdrop-blur border border-blue-100 shadow-sm px-5 py-2 rounded-full translate-y-1/2"
          >
            Ver mais
          </button>
        </div>
      )}
      {expandido && precisaExpandir && (
        <div className="mt-4 pb-2 text-center">
          <button
            onClick={() => setExpandido(false)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition bg-blue-50 px-4 py-1.5 rounded-full"
          >
            Ver menos
          </button>
        </div>
      )}
    </div>
  )
}