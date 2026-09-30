'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Chat direto entre consultor e admin.
 * Funciona tanto no painel do consultor quanto no painel do admin.
 * 
 * @param {string} consultorId - ID do consultor (da tabela consultores)
 * @param {'consultor'|'admin'} autorTipo - Quem está usando o chat
 * @param {string} autorId - auth_id de quem está enviando
 * @param {string} autorNome - Nome de quem está enviando
 */
export default function ChatConsultorAdmin({ consultorId, autorTipo, autorId, autorNome }) {
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!consultorId) return
    carregarMensagens()

    const canalId = `chat-adm-${consultorId}-${Math.random().toString(36).substring(7)}`
    const canal = supabase
      .channel(canalId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_consultor_admin', filter: `consultor_id=eq.${consultorId}` },
        (payload) => {
          setMensagens((atual) => [...atual, payload.new])
          // Se a mensagem veio do outro lado, marca como lida imediatamente
          if (payload.new.autor_tipo !== autorTipo) {
            supabase.from('mensagens_consultor_admin').update({ lida: true }).eq('id', payload.new.id).then(() => {})
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultorId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensagens])

  async function carregarMensagens() {
    const { data, error } = await supabase
      .from('mensagens_consultor_admin')
      .select('*')
      .eq('consultor_id', consultorId)
      .order('created_at', { ascending: true })

    if (!error) setMensagens(data || [])
    setCarregando(false)

    // Marca como lidas todas as mensagens que NÃO são minhas
    await supabase
      .from('mensagens_consultor_admin')
      .update({ lida: true })
      .eq('consultor_id', consultorId)
      .neq('autor_tipo', autorTipo)
      .eq('lida', false)
  }

  async function enviarMensagem(e) {
    e.preventDefault()
    if (!texto.trim()) return

    setEnviando(true)

    try {
      const res = await fetch('/api/mensagens-consultor-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultor_id: consultorId,
          autor_tipo: autorTipo,
          autor_id: autorId,
          autor_nome: autorNome,
          mensagem: texto.trim(),
        })
      })

      setEnviando(false)

      if (res.ok) {
        const msgTexto = texto.trim()
        setTexto('')

      // Gerar notificação para o outro lado
      try {
        if (autorTipo === 'consultor') {
          // Consultor enviou → notificar admin
          fetch('/api/enviar-notificacao-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destino: 'admin',
              tipo: 'mensagem_consultor',
              titulo: `Mensagem de ${autorNome || 'consultor'}`,
              mensagem: msgTexto.length > 100 ? msgTexto.substring(0, 100) + '...' : msgTexto,
              link: '/admin/chats-consultores',
              importancia: 'normal',
              // Dados extras para identificar o consultor
              consultor_id: consultorId,
            }),
          }).catch(() => {})
        } else if (autorTipo === 'admin') {
          // Admin enviou → notificar consultor
          fetch('/api/enviar-notificacao-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destino: 'consultor',
              destino_id: consultorId,
              tipo: 'info',
              titulo: `Mensagem do admin ${autorNome || ''}`,
              mensagem: msgTexto.length > 100 ? msgTexto.substring(0, 100) + '...' : msgTexto,
              link: '/consultor/painel',
              importancia: 'normal',
            }),
          }).catch(() => {})
        }
      } catch {
        // Notificação é best-effort
      }
    }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
      setEnviando(false)
    }
  }

  if (carregando) return null

  return (
    <div className="flex flex-col h-[420px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {mensagens.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p className="text-slate-400 text-sm">
              {autorTipo === 'consultor' ? 'Envie uma mensagem para o admin.' : 'Inicie a conversa com o consultor.'}
            </p>
          </div>
        )}
        {mensagens.map((msg) => {
          const minhaMensagem = msg.autor_tipo === autorTipo
          const ehAdmin = msg.autor_tipo === 'admin'
          return (
            <div key={msg.id} className={`flex ${minhaMensagem ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                minhaMensagem
                  ? (ehAdmin ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white')
                  : (ehAdmin ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-800')
              }`}>
                {!minhaMensagem && (
                  <p className={`text-xs font-semibold mb-0.5 ${ehAdmin ? 'text-amber-700' : 'text-slate-500'}`}>
                    {ehAdmin ? `⚡ Admin · ${msg.autor_nome}` : msg.autor_nome}
                  </p>
                )}
                <p className="text-sm break-words whitespace-pre-wrap">{msg.mensagem}</p>
                <p className={`text-[10px] mt-1 ${
                  minhaMensagem 
                    ? (ehAdmin ? 'text-amber-100' : 'text-blue-100') 
                    : (ehAdmin ? 'text-amber-600' : 'text-slate-400')
                }`}>
                  {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={enviarMensagem} className="flex gap-2">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-1 border border-slate-200 rounded-full px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-400 focus:outline-none transition"
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-40 shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </form>
    </div>
  )
}
