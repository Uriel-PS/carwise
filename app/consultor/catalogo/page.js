'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import GaleriaVeiculo from '../../components/GaleriaVeiculo'

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

export default function CatalogoConsultor() {
  const router = useRouter()
  const [consultor, setConsultor] = useState(null)
  const [veiculos, setVeiculos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [clienteComparacao, setClienteComparacao] = useState(null)

  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroCambio, setFiltroCambio] = useState('')
  const [filtroPrecoMax, setFiltroPrecoMax] = useState('')

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

      const { data: veiculosData, error: veiculosError } = await supabase
        .from('veiculos')
        .select(`
          id, marca, modelo, versao, ano_fabricacao, ano_modelo, cor, cambio,
          combustivel, categoria, km, preco, preco_negociacao, status,
          concessionarias ( nome_fantasia, cidade, estado, telefone ),
          veiculo_fotos (id, url, ordem)
        `)
        .order('created_at', { ascending: false })

      if (veiculosError) setErro(veiculosError.message)
      setVeiculos(veiculosData || [])

      const params = new URLSearchParams(window.location.search)
      const cId = params.get('clienteId')
      if (cId) {
        const [rCli, rPref, rFin, rUso, rPrio] = await Promise.all([
          supabase.from('clientes').select('*').eq('id', cId).maybeSingle(),
          supabase.from('clientes_preferencias').select('*').eq('cliente_id', cId).maybeSingle(),
          supabase.from('clientes_financeiro').select('*').eq('cliente_id', cId).maybeSingle(),
          supabase.from('clientes_uso').select('*').eq('cliente_id', cId).maybeSingle(),
          supabase.from('clientes_prioridades').select('*').eq('cliente_id', cId).maybeSingle(),
        ])
        if (rCli.data) {
          setClienteComparacao({ 
            perfil: rCli.data, 
            preferencias: rPref.data, 
            financeiro: rFin.data, 
            uso: rUso.data, 
            prioridades: rPrio.data 
          })
        }
      }

      setCarregando(false)
    }
    carregar()
  }, [router])

  const categorias = [...new Set(veiculos.map((v) => v.categoria).filter(Boolean))]

  const veiculosFiltrados = veiculos.filter((v) => {
    const bateBusca = !busca ||
      v.marca?.toLowerCase().includes(busca.toLowerCase()) ||
      v.modelo?.toLowerCase().includes(busca.toLowerCase()) ||
      v.concessionarias?.nome_fantasia?.toLowerCase().includes(busca.toLowerCase())

    const bateCategoria = !filtroCategoria || v.categoria === filtroCategoria
    const bateCambio = !filtroCambio || v.cambio === filtroCambio
    const batePreco = !filtroPrecoMax || (v.preco && Number(v.preco) <= Number(filtroPrecoMax))

    return bateBusca && bateCategoria && bateCambio && batePreco
  })

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-lg text-blue-950 hover:text-blue-700 transition">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              CarWise
            </a>
            <span className="text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">Consultor</span>
          </div>
          <a href={clienteComparacao ? `/consultor/cliente/${clienteComparacao.perfil.id}` : "/consultor/painel"} className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition">
            ← Voltar {clienteComparacao ? 'ao cliente' : 'aos clientes'}
          </a>
        </div>
      </header>

      <div className={`mx-auto px-6 py-8 ${clienteComparacao ? 'max-w-7xl flex flex-col lg:flex-row gap-8 items-start' : 'max-w-6xl'}`}>
        
        {clienteComparacao && (
          <aside className="w-full lg:w-[380px] shrink-0 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded-md">Modo Comparação</span>
                <h2 className="font-bold text-blue-950 text-xl mt-2">{clienteComparacao.perfil.nome}</h2>
              </div>
              <a href={`/consultor/cliente/${clienteComparacao.perfil.id}`} className="text-xs font-semibold text-gray-400 hover:text-red-500 transition">
                ✕ Sair
              </a>
            </div>

            <div className="space-y-6">
              {clienteComparacao.perfil && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Dados Pessoais</h3>
                  <div className="space-y-2">
                    <InfoMini label="CPF" value={clienteComparacao.perfil.cpf} />
                    <InfoMini label="E-mail" value={clienteComparacao.perfil.email} />
                    <InfoMini label="Telefone" value={clienteComparacao.perfil.telefone} />
                    <InfoMini label="Profissão" value={clienteComparacao.perfil.profissao} />
                    <InfoMini label="Cidade" value={clienteComparacao.perfil.cidade && clienteComparacao.perfil.estado ? `${clienteComparacao.perfil.cidade} / ${clienteComparacao.perfil.estado}` : null} />
                  </div>
                </div>
              )}

              {clienteComparacao.preferencias && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Preferências</h3>
                  <div className="space-y-2">
                    <InfoMini label="Categoria" value={clienteComparacao.preferencias.categoria} />
                    <InfoMini label="Faixa de Preço" value={
                      clienteComparacao.preferencias.preco_min && clienteComparacao.preferencias.preco_max 
                      ? `R$ ${Number(clienteComparacao.preferencias.preco_min).toLocaleString('pt-BR')} — R$ ${Number(clienteComparacao.preferencias.preco_max).toLocaleString('pt-BR')}`
                      : (clienteComparacao.preferencias.preco_max ? `Até R$ ${Number(clienteComparacao.preferencias.preco_max).toLocaleString('pt-BR')}` : null)
                    } />
                    <InfoMini label="Faixa de Ano" value={
                      clienteComparacao.preferencias.ano_min && clienteComparacao.preferencias.ano_max 
                      ? `${clienteComparacao.preferencias.ano_min} — ${clienteComparacao.preferencias.ano_max}`
                      : (clienteComparacao.preferencias.ano_min ? `A partir de ${clienteComparacao.preferencias.ano_min}` : null)
                    } />
                    <InfoMini label="KM Máxima" value={clienteComparacao.preferencias.km_maxima ? `${clienteComparacao.preferencias.km_maxima} km` : null} />
                    <InfoMini label="Câmbio" value={clienteComparacao.preferencias.cambio} />
                    <InfoMini label="Cor desejada" value={clienteComparacao.preferencias.cor} />
                    <InfoMini label="Marcas Preferidas" value={clienteComparacao.preferencias.marcas_preferidas} />
                    <InfoMini label="Marcas Recusadas" value={clienteComparacao.preferencias.marcas_recusadas} />
                  </div>
                </div>
              )}

              {clienteComparacao.financeiro && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Financeiro</h3>
                  <div className="space-y-2">
                    <InfoMini label="Média de renda" value={clienteComparacao.financeiro.renda_mensal ? `R$ ${Number(clienteComparacao.financeiro.renda_mensal).toLocaleString('pt-BR')}` : null} />
                    <InfoMini label="Entrada" value={clienteComparacao.financeiro.entrada ? `R$ ${Number(clienteComparacao.financeiro.entrada).toLocaleString('pt-BR')}` : null} />
                    <InfoMini label="Parcela Max" value={clienteComparacao.financeiro.parcela_maxima ? `R$ ${Number(clienteComparacao.financeiro.parcela_maxima).toLocaleString('pt-BR')}` : null} />
                    <InfoMini label="Prazo Máximo" value={clienteComparacao.financeiro.prazo_meses ? `${clienteComparacao.financeiro.prazo_meses} meses` : null} />
                    <InfoMini label="Forma pagto" value={clienteComparacao.financeiro.forma_pagamento} />
                    <InfoMini label="Veículo p/ Troca" value={clienteComparacao.financeiro.valor_veiculo_troca ? `Sim — R$ ${Number(clienteComparacao.financeiro.valor_veiculo_troca).toLocaleString('pt-BR')}` : (clienteComparacao.financeiro.tem_veiculo_troca ? 'Sim' : 'Não')} />
                    <InfoMini label="Banco pref." value={clienteComparacao.financeiro.banco_preferencia} />
                  </div>
                </div>
              )}

              {clienteComparacao.uso && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Perfil de Uso</h3>
                  <div className="space-y-2">
                    <InfoMini label="Uso principal" value={clienteComparacao.uso.uso_principal} />
                    <InfoMini label="Pessoas no carro" value={clienteComparacao.uso.pessoas_no_carro} />
                    <InfoMini label="Percurso diário" value={clienteComparacao.uso.percurso_diario} />
                    <InfoMini label="Freq. de viagens" value={clienteComparacao.uso.frequencia_viagens} />
                  </div>
                </div>
              )}

              {clienteComparacao.prioridades && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Prioridades</h3>
                  <div className="space-y-2">
                    {PRIORIDADES_LABELS.map(([campo, label]) => (
                      <div key={campo} className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 w-28 shrink-0">{label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full"
                            style={{ width: `${(clienteComparacao.prioridades[campo] / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-blue-700 font-bold w-4 text-right">
                          {clienteComparacao.prioridades[campo]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        <div className="flex-1 w-full min-w-0">

        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-blue-950 mb-1">Catálogo completo</h1>
        <p className="text-gray-400 text-sm mb-6">{veiculosFiltrados.length} de {veiculos.length} veículos de todas as concessionárias parceiras</p>

        {erro && <p className="text-red-600 text-sm mb-5 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>}

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Buscar marca, modelo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none"
          />
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filtroCambio}
            onChange={(e) => setFiltroCambio(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
          >
            <option value="">Qualquer câmbio</option>
            <option>Automático</option>
            <option>Manual</option>
            <option>CVT</option>
            <option>Automatizado</option>
          </select>
          <input
            type="text"
            placeholder="Preço máximo"
            value={filtroPrecoMax}
            onChange={(e) => setFiltroPrecoMax(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none"
          />
        </div>

        {/* Grid de veículos */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {veiculosFiltrados.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col">
              {v.veiculo_fotos && v.veiculo_fotos.length > 0 && (
                <div className="mb-4">
                  <GaleriaVeiculo fotos={v.veiculo_fotos} />
                </div>
              )}
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-blue-950">{v.marca} {v.modelo} {v.versao}</h3>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full shrink-0 ${v.status === 'ativo' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {v.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">{v.ano_fabricacao}/{v.ano_modelo} · {v.km ? `${v.km} km` : '—'} · {v.cor}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {v.categoria && <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md">{v.categoria}</span>}
                <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md">{v.cambio}</span>
                <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md">{v.combustivel}</span>
              </div>
              <p className="text-lg font-bold text-blue-950 mb-1">
                {v.preco ? Number(v.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—'}
              </p>
              {v.preco_negociacao && (
                <p className="text-xs text-amber-700 font-mono mb-2">mín. negociação: {Number(v.preco_negociacao).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</p>
              )}
              <p className="text-xs text-gray-400 border-t border-gray-50 pt-3 mt-2">
                {v.concessionarias?.nome_fantasia} · {v.concessionarias?.cidade}/{v.concessionarias?.estado}
              </p>
            </div>
          ))}
          {veiculosFiltrados.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-10 bg-white rounded-2xl border border-gray-100">
              Nenhum veículo encontrado com os filtros atuais.
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}

function InfoMini({ label, value }) {
  if (!value || value === 'Não informado' || value === '—') return null
  return (
    <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900 text-right w-1/2 break-words leading-tight">{value}</span>
    </div>
  )
}