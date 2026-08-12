'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

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

export default function DadosCliente() {
  const router = useRouter()
  const params = useParams()
  const clienteId = params.id

  const [perfil, setPerfil] = useState(null)
  const [financeiro, setFinanceiro] = useState(null)
  const [uso, setUso] = useState(null)
  const [preferencias, setPreferencias] = useState(null)
  const [prioridades, setPrioridades] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        router.push('/consultor/login')
        return
      }

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

      setCarregando(false)
    }

    carregar()
  }, [router, clienteId])

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
          <a href={`/consultor/cliente/${clienteId}`} className="text-blue-600 font-medium text-sm">← Voltar</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50 pb-10">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <a href={`/consultor/cliente/${clienteId}`} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 font-medium">
            ← Voltar para {perfil?.nome}
          </a>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 mt-10">
        <h1 className="text-2xl font-bold text-blue-900 mb-6">Dossiê Completo</h1>

        {perfil && (
          <Secao titulo="Dados pessoais">
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
          <Secao titulo="Dados financeiros">
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

        {uso && (
          <Secao titulo="Perfil de uso">
            <InfoRow label="Uso principal" value={uso.uso_principal} />
            <InfoRow label="Pessoas no carro" value={uso.pessoas_no_carro} />
            <InfoRow label="Percurso diário" value={uso.percurso_diario} />
            <InfoRow label="Frequência de viagens" value={uso.frequencia_viagens} />
          </Secao>
        )}

        {preferencias && (
          <Secao titulo="Preferências do veículo">
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
          <Secao titulo="O que é mais importante para o cliente">
            <div className="space-y-3">
              {PRIORIDADES_LABELS.map(([campo, label]) => (
                <div key={campo} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-40 shrink-0">{label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full"
                      style={{ width: `${(prioridades[campo] / 10) * 100}%` }}
                    />
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
