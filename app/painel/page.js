'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

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

export default function Painel() {
  const router = useRouter()
  const [usuario, setUsuario] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [financeiro, setFinanceiro] = useState(null)
  const [uso, setUso] = useState(null)
  const [preferencias, setPreferencias] = useState(null)
  const [prioridades, setPrioridades] = useState(null)
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
        setErro('Não foi possível carregar seu perfil: ' + perfilError.message)
        setCarregando(false)
        return
      }

      setPerfil(perfilData)
      const clienteId = perfilData.id

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

    carregarDados()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
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
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-xl text-blue-950">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            CarWise
          </a>
          <button
            onClick={handleLogout}
            className="text-sm font-semibold text-gray-500 hover:text-red-600 transition"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">

        <div className="bg-white rounded-2xl shadow-[0_20px_50px_-24px_rgba(10,34,71,0.15)] border border-gray-50 p-8 md:p-10 mb-5">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <p className="text-xs font-mono text-blue-600 uppercase tracking-widest mb-2">Seu painel</p>
              <h1 className="font-[family-name:var(--font-display)] font-bold text-3xl text-blue-950">
                Olá, {perfil?.nome || usuario?.email}
              </h1>
            </div>
            <a
              href="/painel/editar"
              className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 hover:-translate-y-0.5 transition shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Editar meu perfil
            </a>
          </div>
        </div>

        {erro && (
          <p className="text-red-600 text-sm mb-5 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>
        )}

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
            <InfoRow label="Valor disponível" value={formatarMoeda(financeiro.valor_disponivel)} />
            <InfoRow label="Entrada" value={formatarMoeda(financeiro.entrada)} />
            <InfoRow label="Parcela máxima" value={formatarMoeda(financeiro.parcela_maxima)} />
            <InfoRow label="Prazo máximo" value={financeiro.prazo_meses ? `${financeiro.prazo_meses} meses` : null} />
            <InfoRow label="Forma de pagamento" value={financeiro.forma_pagamento} />
            <InfoRow label="Veículo para troca" value={financeiro.tem_veiculo_troca ? `Sim — ${formatarMoeda(financeiro.valor_veiculo_troca) || 'valor não informado'}` : 'Não'} />
            <InfoRow label="Restrição no nome" value={financeiro.tem_restricao ? 'Sim' : 'Não'} />
            <InfoRow label="Banco de preferência" value={financeiro.banco_preferencia} />
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
            <InfoRow label="Potência mínima" value={preferencias.potencia_min} />
            <InfoRow label="Combustível" value={preferencias.combustivel} />
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

function Secao({ titulo, icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h2 className="font-[family-name:var(--font-display)] font-semibold text-blue-950 text-lg">{titulo}</h2>
      </div>
      <div className="space-y-3">
        {children}
      </div>
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

function IconPessoa() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12z" stroke="#2B5FE0" strokeWidth="1.6"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" stroke="#2B5FE0" strokeWidth="1.6" strokeLinecap="round"/></svg>
}
function IconFinanceiro() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" stroke="#2B5FE0" strokeWidth="1.6" strokeLinejoin="round"/></svg>
}
function IconUso() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 6h18M3 18h18" stroke="#2B5FE0" strokeWidth="1.6" strokeLinecap="round"/></svg>
}
function IconVeiculo() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 16l1.4-4.5A2 2 0 017.3 10h9.4a2 2 0 011.9 1.5L20 16" stroke="#2B5FE0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="16" width="18" height="4" rx="1.5" stroke="#2B5FE0" strokeWidth="1.6"/><circle cx="7.5" cy="20" r="1.1" stroke="#2B5FE0" strokeWidth="1.4"/><circle cx="16.5" cy="20" r="1.1" stroke="#2B5FE0" strokeWidth="1.4"/></svg>
}
function IconPrioridade() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.9 6.3 6.8.6-5.1 4.6 1.5 6.7L12 16.9l-6.1 3.3 1.5-6.7-5.1-4.6 6.8-.6L12 2z" stroke="#2B5FE0" strokeWidth="1.6" strokeLinejoin="round"/></svg>
}