'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const PLANOS = [
  { nome: 'Básico', valor: 199, descricao: 'Pesquisa de mercado, indicação de veículos e análise documental.' },
  { nome: 'Premium', valor: 499, descricao: 'Negociação conduzida pelo consultor e vistoria mecânica.' },
  { nome: 'Concierge', valor: 999, descricao: 'Test drive conduzido e documentação completa de ponta a ponta.' },
]

export default function Pagamentos({ clienteId }) {
  const [pagamentos, setPagamentos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [mostrarPlanos, setMostrarPlanos] = useState(false)
  const [solicitando, setSolicitando] = useState(false)

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId])

  async function carregar() {
    const { data } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    setPagamentos(data || [])
    setCarregando(false)
  }

  async function solicitarPlano(plano) {
    setSolicitando(true)

    const { error } = await supabase.from('pagamentos').insert([{
      cliente_id: clienteId,
      plano: plano.nome,
      valor: plano.valor,
      status: 'pendente',
    }])

    setSolicitando(false)

    if (!error) {
      setMostrarPlanos(false)
      carregar()

      // Notificar o admin
      fetch('/api/enviar-notificacao-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destino: 'admin',
          tipo: 'pagamento',
          titulo: 'Novo plano solicitado',
          mensagem: `Um cliente acabou de solicitar a contratação do plano ${plano.nome}.`,
          link: '/admin/pagamentos',
          importancia: 'alta',
        }),
      }).catch(() => {})
    }
  }

  if (carregando) return null

  const temPendente = pagamentos.some((p) => p.status === 'pendente')
  const temConfirmado = pagamentos.some((p) => p.status === 'confirmado')

  return (
    <div>
      {!temConfirmado && !mostrarPlanos && (
        <button
          onClick={() => setMostrarPlanos(true)}
          disabled={temPendente}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed mb-5"
        >
          {temPendente ? 'Aguardando confirmação do pagamento' : '+ Escolher um plano'}
        </button>
      )}

      {mostrarPlanos && (
        <div className="grid md:grid-cols-3 gap-3 mb-6">
          {PLANOS.map((plano) => (
            <div key={plano.nome} className="border border-gray-200 rounded-xl p-5">
              <h4 className="font-semibold text-blue-950 mb-1">{plano.nome}</h4>
              <p className="text-2xl font-bold text-blue-950 mb-2">R${plano.valor}</p>
              <p className="text-xs text-gray-500 mb-4">{plano.descricao}</p>
              <button
                onClick={() => solicitarPlano(plano)}
                disabled={solicitando}
                className="w-full bg-blue-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {solicitando ? 'Enviando...' : 'Escolher este plano'}
              </button>
            </div>
          ))}
        </div>
      )}

      {pagamentos.length === 0 ? (
        <p className="text-gray-400 text-sm">Nenhum plano contratado ainda.</p>
      ) : (
        <div className="space-y-3">
          {pagamentos.map((p) => (
            <div key={p.id} className="border border-gray-100 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-blue-950">Plano {p.plano}</p>
                <p className="text-xs text-gray-400">
                  R${p.valor} · {new Date(p.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span className={`text-xs font-mono px-2.5 py-1 rounded-full ${
                p.status === 'confirmado' ? 'bg-green-50 text-green-700' :
                p.status === 'cancelado' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-700'
              }`}>
                {p.status === 'confirmado' ? '✓ Pago' : p.status === 'cancelado' ? 'Cancelado' : 'Aguardando confirmação'}
              </span>
            </div>
          ))}
        </div>
      )}

      {temPendente && (
        <div className="bg-amber-50 rounded-xl p-4 mt-4">
          <p className="text-xs text-amber-800">
            O admin vai entrar em contato para combinar a forma de pagamento (PIX ou transferência) e confirmar sua contratação.
          </p>
        </div>
      )}
    </div>
  )
}