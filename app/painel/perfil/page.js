'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { simularFinanciamento } from '../../lib/simulacaoFinanciamento'

const PRIORIDADES_LABELS = [
  ['economia', 'Economia'], ['conforto', 'Conforto'], ['tecnologia', 'Tecnologia'],
  ['espaco', 'Espaço'], ['potencia', 'Potência'], ['seguranca', 'Segurança'],
  ['baixa_manutencao', 'Baixa manutenção'], ['revenda_facil', 'Revenda fácil'],
  ['design', 'Design'], ['status', 'Status'],
]

export default function MeuPerfilCompleto() {
  const router = useRouter()
  const [perfil, setPerfil] = useState(null)
  const [financeiro, setFinanceiro] = useState(null)
  const [uso, setUso] = useState(null)
  const [preferencias, setPreferencias] = useState(null)
  const [prioridades, setPrioridades] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/login'); return }

      const user = sessionData.session.user

      const { data: perfilData } = await supabase
        .from('clientes').select('*').eq('auth_id', user.id).single()

      if (!perfilData) { router.push('/painel'); return }

      setPerfil(perfilData)

      const [rFin, rUso, rPref, rPrio] = await Promise.all([
        supabase.from('clientes_financeiro').select('*').eq('cliente_id', perfilData.id).maybeSingle(),
        supabase.from('clientes_uso').select('*').eq('cliente_id', perfilData.id).maybeSingle(),
        supabase.from('clientes_preferencias').select('*').eq('cliente_id', perfilData.id).maybeSingle(),
        supabase.from('clientes_prioridades').select('*').eq('cliente_id', perfilData.id).maybeSingle(),
      ])

      setFinanceiro(rFin.data)
      setUso(rUso.data)
      setPreferencias(rPref.data)
      setPrioridades(rPrio.data)
      setCarregando(false)
    }
    carregar()
  }, [router])

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  const simulacao = (financeiro && preferencias)
    ? simularFinanciamento({
        precoVeiculo: preferencias.preco_max,
        renda: financeiro.renda_mensal,
        entrada: financeiro.entrada,
        prazoMeses: financeiro.prazo_meses,
      })
    : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white/90 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <a href="/painel" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 transition font-medium">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Voltar ao painel
          </a>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-3xl text-blue-950 mb-8">Meus dados completos</h1>

        {perfil && (
          <Secao titulo="Dados pessoais" icon={<IconPessoa />}>
            <InfoRow label="Nome completo" value={perfil.nome} />
            <InfoRow label="CPF" value={perfil.cpf} />
            <InfoRow label="Data de nascimento" value={formatarData(perfil.data_nascimento)} />
            <InfoRow label="E-mail" value={perfil.email} />
            <InfoRow label="Telefone" value={perfil.telefone} />
            <InfoRow label="Estado civil" value={perfil.estado_civil} />
            <InfoRow label="Profissão" value={perfil.profissao} />
            <InfoRow label="Local de trabalho" value={perfil.empresa} />
            <InfoRow label="Cidade / UF" value={perfil.cidade && perfil.estado ? `${perfil.cidade} / ${perfil.estado}` : null} />
          </Secao>
        )}

        {financeiro && (
          <Secao titulo="Dados financeiros" icon={<IconFinanceiro />}>
            <InfoRow label="Média de renda mensal" value={formatarMoeda(financeiro.renda_mensal)} />
            <InfoRow label="Renda familiar" value={formatarMoeda(financeiro.renda_familiar)} />
            <InfoRow label="Entrada" value={formatarMoeda(financeiro.entrada)} />
            <InfoRow label="Parcela máxima" value={formatarMoeda(financeiro.parcela_maxima)} />
            <InfoRow label="Prazo máximo" value={financeiro.prazo_meses ? `${financeiro.prazo_meses} meses` : null} />
            <InfoRow label="Forma de pagamento" value={financeiro.forma_pagamento} />
            <InfoRow label="Veículo para troca" value={financeiro.tem_veiculo_troca ? `Sim — ${formatarMoeda(financeiro.valor_veiculo_troca) || 'valor não informado'}` : 'Não'} />
            <InfoRow label="Restrição no nome" value={financeiro.tem_restricao ? 'Sim' : 'Não'} />
            <InfoRow label="Banco de preferência" value={financeiro.banco_preferencia} />
            <InfoRow label="Autoriza análise de financiamento" value={financeiro.autoriza_analise_financiamento ? '✓ Sim, autorizado' : 'Não autorizado'} />
          </Secao>
        )}

        {simulacao && (
          <Secao titulo="Simulação de financiamento" icon={<IconFinanceiro />}>
            <p className="text-xs text-gray-400 mb-4">
              Estimativa educativa baseada na sua renda informada — não é uma aprovação de crédito real.
            </p>
            <div className={`rounded-xl p-5 mb-4 ${
              simulacao.status === 'confortavel' ? 'bg-green-50' :
              simulacao.status === 'atencao' ? 'bg-amber-50' : 'bg-red-50'
            }`}>
              <p className={`text-sm font-medium ${
                simulacao.status === 'confortavel' ? 'text-green-700' :
                simulacao.status === 'atencao' ? 'text-amber-700' : 'text-red-700'
              }`}>
                {simulacao.mensagem}
              </p>
            </div>
            <InfoRow label="Valor a financiar" value={formatarMoeda(simulacao.valorFinanciado)} />
            <InfoRow label="Parcela estimada" value={formatarMoeda(simulacao.parcelaEstimada)} />
            <InfoRow label="Comprometimento da renda" value={`${simulacao.comprometimentoRenda}%`} />
          </Secao>
        )}

        {uso && (
          <Secao titulo="Perfil de uso" icon={<IconUso />}>
            <InfoRow label="Uso principal" value={uso.uso_principal} />
            <InfoRow label="Pessoas no carro" value={uso.pessoas_no_carro} />
            <InfoRow label="Percurso diário" value={uso.percurso_diario} />
            <InfoRow label="Frequência de viagens" value={uso.frequencia_viagens} />
          </Secao>
        )}

        {preferencias && (
          <Secao titulo="Preferências do veículo" icon={<IconVeiculo />}>
            <InfoRow label="Categoria" value={preferencias.categoria} />
            <InfoRow label="Faixa de preço" value={formatarFaixa(preferencias.preco_min, preferencias.preco_max, formatarMoeda)} />
            <InfoRow label="Faixa de ano" value={formatarFaixa(preferencias.ano_min, preferencias.ano_max)} />
            <InfoRow label="Quilometragem máxima" value={preferencias.km_maxima ? `${preferencias.km_maxima} km` : null} />
            <InfoRow label="Transmissão" value={preferencias.cambio} />
            <InfoRow label="Cor desejada" value={preferencias.cor} />
            <InfoRow label="Marcas preferidas" value={preferencias.marcas_preferidas} />
            <InfoRow label="Marcas que não aceita" value={preferencias.marcas_recusadas} />
          </Secao>
        )}

        {prioridades && (
          <Secao titulo="O que é mais importante para você" icon={<IconPrioridade />}>
            <div className="space-y-3">
              {PRIORIDADES_LABELS.map(([campo, label]) => (
                <div key={campo} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-40 shrink-0">{label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${(prioridades[campo] / 10) * 100}%` }} />
                  </div>
                  <span className="text-sm font-mono text-blue-700 w-6 text-right">{prioridades[campo]}</span>
                </div>
              ))}
            </div>
          </Secao>
        )}
      </div>
    </div>
  )
}

function Secao({ titulo, icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">{icon}</div>
        <h2 className="font-[family-name:var(--font-display)] font-semibold text-blue-950 text-lg">{titulo}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
      <span className="text-gray-400">{label}</span>
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

function IconPessoa() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12z" stroke="#2B5FE0" strokeWidth="1.6"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" stroke="#2B5FE0" strokeWidth="1.6" strokeLinecap="round"/></svg> }
function IconFinanceiro() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" stroke="#2B5FE0" strokeWidth="1.6" strokeLinejoin="round"/></svg> }
function IconUso() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 6h18M3 18h18" stroke="#2B5FE0" strokeWidth="1.6" strokeLinecap="round"/></svg> }
function IconVeiculo() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 16l1.4-4.5A2 2 0 017.3 10h9.4a2 2 0 011.9 1.5L20 16" stroke="#2B5FE0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="16" width="18" height="4" rx="1.5" stroke="#2B5FE0" strokeWidth="1.6"/></svg> }
function IconPrioridade() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.9 6.3 6.8.6-5.1 4.6 1.5 6.7L12 16.9l-6.1 3.3 1.5-6.7-5.1-4.6 6.8-.6L12 2z" stroke="#2B5FE0" strokeWidth="1.6" strokeLinejoin="round"/></svg> }
