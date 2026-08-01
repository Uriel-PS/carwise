'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function PagamentosAdmin() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [pagamentos, setPagamentos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState('pendente')

  useEffect(() => {
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/admin/login'); return }

      const user = sessionData.session.user

      const { data: adminData } = await supabase
        .from('admins').select('*').eq('auth_id', user.id).eq('ativo', true).maybeSingle()

      if (!adminData) { router.push('/admin/login'); return }
      setAdmin(adminData)

      const { data: pagamentosData } = await supabase
        .from('pagamentos')
        .select('*, clientes ( nome, email, telefone )')
        .order('created_at', { ascending: false })

      setPagamentos(pagamentosData || [])
      setCarregando(false)
    }
    carregar()
  }, [router])

  async function confirmarPagamento(id, metodo) {
    const { data: sessionData } = await supabase.auth.getSession()

    await supabase
      .from('pagamentos')
      .update({
        status: 'confirmado',
        metodo,
        confirmado_por: sessionData.session.user.id,
        confirmado_em: new Date().toISOString(),
      })
      .eq('id', id)

    setPagamentos(pagamentos.map((p) => p.id === id ? { ...p, status: 'confirmado', metodo } : p))
  }

  async function cancelarPagamento(id) {
    if (!confirm('Cancelar esta solicitação de pagamento?')) return
    await supabase.from('pagamentos').update({ status: 'cancelado' }).eq('id', id)
    setPagamentos(pagamentos.map((p) => p.id === id ? { ...p, status: 'cancelado' } : p))
  }

  const pagamentosFiltrados = pagamentos.filter((p) => filtro === 'todos' || p.status === filtro)

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <a href="/admin/painel" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 font-medium">
            ← Voltar para o painel
          </a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-blue-950 mb-6">Pagamentos</h1>

        <div className="flex gap-2 mb-6">
          {['pendente', 'confirmado', 'cancelado', 'todos'].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition capitalize ${filtro === f ? 'bg-blue-950 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {pagamentosFiltrados.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-blue-950">{p.clientes?.nome}</p>
                  <p className="text-xs text-gray-400">{p.clientes?.email} · {p.clientes?.telefone}</p>
                </div>
                <span className={`text-xs font-mono px-2.5 py-1 rounded-full shrink-0 ${
                  p.status === 'confirmado' ? 'bg-green-50 text-green-700' :
                  p.status === 'cancelado' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-700'
                }`}>
                  {p.status}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm mb-3">
                <span className="text-gray-600">Plano <strong>{p.plano}</strong></span>
                <span className="font-semibold text-blue-950">R${p.valor}</span>
              </div>

              <p className="text-xs text-gray-400 mb-3">
                Solicitado em {new Date(p.created_at).toLocaleDateString('pt-BR')}
                {p.confirmado_em && ` · Confirmado em ${new Date(p.confirmado_em).toLocaleDateString('pt-BR')}`}
                {p.metodo && ` · via ${p.metodo}`}
              </p>

              {p.status === 'pendente' && (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => confirmarPagamento(p.id, 'pix')} className="text-xs font-semibold bg-green-50 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-100 transition">
                    Confirmar via PIX
                  </button>
                  <button onClick={() => confirmarPagamento(p.id, 'transferencia')} className="text-xs font-semibold bg-green-50 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-100 transition">
                    Confirmar via transferência
                  </button>
                  <button onClick={() => cancelarPagamento(p.id)} className="text-xs font-semibold bg-red-50 text-red-600 px-3 py-1.5 rounded-full hover:bg-red-100 transition">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
          {pagamentosFiltrados.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-14">Nenhum pagamento nesse filtro.</p>
          )}
        </div>
      </div>
    </div>
  )
}