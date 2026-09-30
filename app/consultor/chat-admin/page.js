'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import ChatConsultorAdmin from '../../components/ChatConsultorAdmin'

export default function ChatComAdminPage() {
  const router = useRouter()
  const [consultor, setConsultor] = useState(null)
  const [carregando, setCarregando] = useState(true)

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
      setCarregando(false)
    }
    carregar()
  }, [router])

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-400 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-slate-900 mb-1">
          Chat com Admin
        </h1>
        <p className="text-slate-400 text-sm">
          Converse diretamente com a administração da CarWise.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 p-6">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <span className="text-amber-700 font-bold text-sm">⚡</span>
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Administração CarWise</h2>
            <p className="text-xs text-slate-400">Canal direto com o admin</p>
          </div>
        </div>

        <ChatConsultorAdmin
          consultorId={consultor.id}
          autorTipo="consultor"
          autorId={consultor.auth_id}
          autorNome={consultor.nome}
        />
      </div>
    </div>
  )
}
