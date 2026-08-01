'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import ChatConsultor from '../../components/ChatConsultor'

export default function ChatsAdmin() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [clientes, setClientes] = useState([])
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/admin/login'); return }

      const user = sessionData.session.user

      const { data: adminData } = await supabase
        .from('admins').select('*').eq('auth_id', user.id).eq('ativo', true).maybeSingle()

      if (!adminData) { router.push('/admin/login'); return }
      setAdmin(adminData)

      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, email, consultores ( nome )')
        .order('nome', { ascending: true })

      setClientes(clientesData || [])
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <a href="/admin/painel" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 font-medium">
            ← Voltar para o painel
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-blue-950 mb-6">Todas as conversas</h1>

        <div className="grid md:grid-cols-[280px_1fr] gap-5 min-w-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-h-[600px] overflow-y-auto">
            {clientes.map((c) => (
              <button
                key={c.id}
                onClick={() => setClienteSelecionado(c)}
                className={`w-full text-left px-5 py-4 border-b border-gray-50 last:border-0 transition ${
                  clienteSelecionado?.id === c.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <p className="text-sm font-medium text-blue-950">{c.nome}</p>
                <p className="text-xs text-gray-400">Consultor: {c.consultores?.nome || 'não atribuído'}</p>
              </button>
            ))}
            {clientes.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-10">Nenhum cliente cadastrado ainda.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-w-0 overflow-hidden">
            {clienteSelecionado ? (
              <>
                <h2 className="font-semibold text-blue-950 mb-4">{clienteSelecionado.nome}</h2>
                <ChatConsultor
                  clienteId={clienteSelecionado.id}
                  autorTipo="admin"
                  autorId={admin.auth_id}
                  autorNome={admin.nome}
                />
              </>
            ) : (
              <p className="text-gray-400 text-sm text-center py-20">Selecione um cliente para ver a conversa.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}