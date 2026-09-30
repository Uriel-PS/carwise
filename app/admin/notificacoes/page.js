'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const TIPO_ICONE = {
  pagamento: '💳',
  comissao: '💰',
  mensagem_consultor: '💬',
  novo_cliente: '🔔',
  info: '💡',
  sistema: '⚙️',
}

const TIPO_LABEL = {
  pagamento: 'Pagamento',
  comissao: 'Comissão',
  mensagem_consultor: 'Mensagem',
  novo_cliente: 'Novo cliente',
  info: 'Informação',
  sistema: 'Sistema',
}

export default function NotificacoesAdmin() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [notificacoes, setNotificacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState('todas')

  useEffect(() => {
    async function carregar() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/admin/login'); return }

      const user = sessionData.session.user

      const { data: adminData } = await supabase
        .from('admins').select('*').eq('auth_id', user.id).eq('ativo', true).maybeSingle()

      if (!adminData) { router.push('/admin/login'); return }
      setAdmin(adminData)

      const { data } = await supabase
        .from('notificacoes_admin')
        .select('*')
        .eq('admin_id', adminData.id)
        .order('created_at', { ascending: false })
        .limit(200)

      setNotificacoes(data || [])
      setCarregando(false)
    }
    carregar()
  }, [router])

  async function marcarComoLida(id) {
    await supabase.from('notificacoes_admin').update({ lida: true }).eq('id', id)
    setNotificacoes((prev) => prev.map((n) => n.id === id ? { ...n, lida: true } : n))
  }

  async function marcarTodasComoLidas() {
    if (!admin) return
    await supabase
      .from('notificacoes_admin')
      .update({ lida: true })
      .eq('admin_id', admin.id)
      .eq('lida', false)
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
  }

  const naoLidas = notificacoes.filter((n) => !n.lida).length

  const filtradas = filtro === 'todas'
    ? notificacoes
    : filtro === 'nao_lidas'
      ? notificacoes.filter((n) => !n.lida)
      : notificacoes.filter((n) => n.tipo === filtro)

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  function formatarData(d) {
    const data = new Date(d)
    const agora = new Date()
    const diff = agora - data
    if (diff < 60000) return 'agora mesmo'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min atrás`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin/painel" className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition">← Voltar ao painel</a>
            <span className="text-gray-300">|</span>
            <h1 className="font-bold text-blue-950">Notificações</h1>
            {naoLidas > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5">
                {naoLidas}
              </span>
            )}
          </div>
          {naoLidas > 0 && (
            <button
              onClick={marcarTodasComoLidas}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'todas', label: 'Todas' },
            { key: 'nao_lidas', label: `Não lidas (${naoLidas})` },
            { key: 'pagamento', label: '💳 Pagamentos' },
            { key: 'comissao', label: '💰 Comissões' },
            { key: 'mensagem_consultor', label: '💬 Mensagens' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition ${
                filtro === f.key
                  ? 'bg-blue-950 text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="space-y-2">
          {filtradas.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-xl border px-5 py-4 transition ${
                n.lida ? 'border-gray-100' : 'border-blue-200 bg-blue-50/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
                  n.lida ? 'bg-gray-100' : 'bg-blue-100'
                }`}>
                  {TIPO_ICONE[n.tipo] || '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {!n.lida && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                    <p className="text-sm font-semibold text-slate-900 truncate">{n.titulo}</p>
                  </div>
                  {n.mensagem && (
                    <p className="text-xs text-slate-500 line-clamp-2">{n.mensagem}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] font-mono text-slate-400">{formatarData(n.created_at)}</span>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                      n.tipo === 'pagamento' ? 'bg-emerald-50 text-emerald-600' :
                      n.tipo === 'comissao' ? 'bg-amber-50 text-amber-600' :
                      n.tipo === 'mensagem_consultor' ? 'bg-blue-50 text-blue-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {TIPO_LABEL[n.tipo] || n.tipo}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {n.link && (
                    <a href={n.link} className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition">
                      Ver →
                    </a>
                  )}
                  {!n.lida && (
                    <button
                      onClick={() => marcarComoLida(n.id)}
                      className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition"
                    >
                      ✓
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtradas.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-2xl">🔔</div>
              <p className="text-slate-400 text-sm">Nenhuma notificação{filtro !== 'todas' ? ' nesse filtro' : ''}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
