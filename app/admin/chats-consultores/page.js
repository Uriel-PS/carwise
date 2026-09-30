'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import ChatConsultorAdmin from '../../components/ChatConsultorAdmin'

export default function ChatsConsultoresAdmin() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [consultores, setConsultores] = useState([])
  const [consultorSelecionado, setConsultorSelecionado] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [naoLidasPorConsultor, setNaoLidasPorConsultor] = useState({})

  useEffect(() => {
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/admin/login'); return }

      const user = sessionData.session.user

      const { data: adminData } = await supabase
        .from('admins').select('*').eq('auth_id', user.id).eq('ativo', true).maybeSingle()

      if (!adminData) { router.push('/admin/login'); return }
      setAdmin(adminData)

      const { data: consultoresData } = await supabase
        .from('consultores')
        .select('id, nome, email, ativo')
        .order('ativo', { ascending: false })
        .order('nome', { ascending: true })

      setConsultores(consultoresData || [])

      // Contar mensagens não lidas por consultor
      const { data: naoLidas } = await supabase
        .from('mensagens_consultor_admin')
        .select('consultor_id')
        .eq('autor_tipo', 'consultor')
        .eq('lida', false)

      if (naoLidas) {
        const contagem = {}
        naoLidas.forEach((m) => {
          contagem[m.consultor_id] = (contagem[m.consultor_id] || 0) + 1
        })
        setNaoLidasPorConsultor(contagem)
      }

      setCarregando(false)
    }
    carregar()
  }, [router])

  // Ao selecionar um consultor, zerar a contagem local de não lidas
  function selecionarConsultor(c) {
    setConsultorSelecionado(c)
    setNaoLidasPorConsultor((prev) => ({ ...prev, [c.id]: 0 }))
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <a href="/admin/painel" className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition">← Voltar ao painel</a>
          <span className="text-gray-300">|</span>
          <h1 className="font-bold text-blue-950">Mensagens de Consultores</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-[280px_1fr] gap-5 min-w-0">
          {/* Lista de consultores */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-h-[600px] overflow-y-auto">
            {consultores.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-10">Nenhum consultor cadastrado.</p>
            )}
            {consultores.map((c) => {
              const naoLidas = naoLidasPorConsultor[c.id] || 0
              return (
                <button
                  key={c.id}
                  onClick={() => selecionarConsultor(c)}
                  className={`w-full text-left px-5 py-4 border-b border-gray-50 last:border-0 transition ${
                    consultorSelecionado?.id === c.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-blue-950 truncate">{c.nome}</p>
                        {!c.ativo && (
                          <span className="text-[9px] font-mono bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full shrink-0">inativo</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{c.email}</p>
                    </div>
                    {naoLidas > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 shrink-0 ml-2">
                        {naoLidas > 99 ? '99+' : naoLidas}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Chat */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-w-0 overflow-hidden">
            {consultorSelecionado ? (
              <>
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {consultorSelecionado.nome?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <h2 className="font-semibold text-blue-950">{consultorSelecionado.nome}</h2>
                    <p className="text-xs text-gray-400">{consultorSelecionado.email}</p>
                  </div>
                </div>
                <ChatConsultorAdmin
                  consultorId={consultorSelecionado.id}
                  autorTipo="admin"
                  autorId={admin.auth_id}
                  autorNome={admin.nome}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[420px] text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <p className="text-gray-400 text-sm">Selecione um consultor para conversar.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
