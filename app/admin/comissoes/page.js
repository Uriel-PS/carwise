'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const STATUS_COR = {
  prevista: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
  pendente: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  aprovada: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  paga: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  cancelada: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
}

export default function AdminComissoes() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [comissoes, setComissoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [atualizandoId, setAtualizandoId] = useState(null)

  useEffect(() => {
    async function carregarTudo() {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        router.push('/admin/login')
        return
      }

      const user = sessionData.session.user

      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('auth_id', user.id)
        .eq('ativo', true)
        .maybeSingle()

      if (!adminData) {
        router.push('/admin/login')
        return
      }

      setAdmin(adminData)
      carregarComissoes()
    }

    carregarTudo()
  }, [router])

  async function carregarComissoes() {
    const { data } = await supabase
      .from('comissoes')
      .select('*, consultores(nome), clientes(nome)')
      .order('created_at', { ascending: false })

    setComissoes(data || [])
    setCarregando(false)
  }

  async function avancarStatus(id, consultorId, statusAtual) {
    if (statusAtual === 'paga' || statusAtual === 'cancelada') return
    
    setAtualizandoId(id)
    const novoStatus = statusAtual === 'prevista' || statusAtual === 'pendente' ? 'aprovada' : 'paga'

    const { error } = await supabase.from('comissoes').update({ status: novoStatus }).eq('id', id)
    
    if (!error) {
      if (novoStatus === 'paga') {
        // Gerar notificação pro consultor
        await supabase.from('notificacoes_consultor').insert([{
          consultor_id: consultorId,
          tipo: 'comissao',
          titulo: 'Comissão Paga',
          mensagem: 'Uma de suas comissões acabou de ser marcada como PAGA.',
          lida: false
        }])
      }
      carregarComissoes()
    } else {
      alert('Erro ao atualizar: ' + error.message)
    }
    
    setAtualizandoId(null)
  }

  async function cancelarComissao(id) {
    if (!confirm('Tem certeza que deseja cancelar esta comissão?')) return

    setAtualizandoId(id)
    const { error } = await supabase.from('comissoes').update({ status: 'cancelada' }).eq('id', id)
    
    if (!error) {
      carregarComissoes()
    } else {
      alert('Erro ao cancelar: ' + error.message)
    }
    
    setAtualizandoId(null)
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  const fmtMoeda = (v) => {
    if (!v && v !== 0) return 'R$ 0'
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <a href="/admin/painel" className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition">← Voltar ao painel</a>
          <span className="text-gray-300">|</span>
          <h1 className="font-bold text-blue-950">Gerenciar Comissões</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70 text-left text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3.5 font-semibold">Consultor</th>
                <th className="px-6 py-3.5 font-semibold">Cliente</th>
                <th className="px-6 py-3.5 font-semibold">Valor da Venda</th>
                <th className="px-6 py-3.5 font-semibold">Comissão</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
                <th className="px-6 py-3.5 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {comissoes.map((c) => {
                const cor = STATUS_COR[c.status] || STATUS_COR.prevista
                return (
                  <tr key={c.id} className="border-t border-slate-50 hover:bg-blue-50/30 transition">
                    <td className="px-6 py-4 font-medium text-slate-800">{c.consultores?.nome || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{c.clientes?.nome || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{fmtMoeda(c.valor_venda)}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{fmtMoeda(c.valor)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${cor.bg} ${cor.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cor.dot}`} />
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.status !== 'paga' && c.status !== 'cancelada' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => cancelarComissao(c.id)}
                            disabled={atualizandoId === c.id}
                            className="text-[10px] font-semibold bg-red-50 text-red-600 px-3 py-1.5 rounded-full hover:bg-red-100 transition disabled:opacity-50"
                          >
                            ✕ Cancelar
                          </button>
                          <button
                            onClick={() => avancarStatus(c.id, c.consultor_id, c.status)}
                            disabled={atualizandoId === c.id}
                            className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100 transition disabled:opacity-50"
                          >
                            {atualizandoId === c.id ? 'Aguarde...' : (c.status === 'prevista' || c.status === 'pendente' ? 'Aprovar →' : 'Marcar como Paga ✓')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {comissoes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-slate-400 text-sm">
                    Nenhuma comissão registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
