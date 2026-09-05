'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ChatConsultor({ clienteId, autorTipo, autorId, autorNome }) {
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    carregarMensagens()

    // Inscreve para receber novas mensagens em tempo real
    const canalId = `chat-${clienteId}-${Math.random().toString(36).substring(7)}`
    const canal = supabase
      .channel(canalId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `cliente_id=eq.${clienteId}` },
        (payload) => {
          setMensagens((atual) => [...atual, payload.new])
          // Se a mensagem for do outro, marca como lida já que o chat está aberto
          if (payload.new.autor_tipo !== autorTipo) {
            supabase.from('mensagens_chat').update({ lida: true }).eq('id', payload.new.id).then(() => {})
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensagens])

  async function carregarMensagens() {
    const { data, error } = await supabase
      .from('mensagens_chat')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: true })

    if (!error) setMensagens(data || [])
    setCarregando(false)

    // Marca como lidas todas as mensagens que NÃO são minhas (do outro lado)
    await supabase
      .from('mensagens_chat')
      .update({ lida: true })
      .eq('cliente_id', clienteId)
      .neq('autor_tipo', autorTipo)
      .eq('lida', false)
  }

  async function enviarMensagem(e) {
    e.preventDefault()
    if (!texto.trim()) return

    setEnviando(true)

    const { error } = await supabase.from('mensagens_chat').insert([{
      cliente_id: clienteId,
      autor_tipo: autorTipo,
      autor_id: autorId,
      autor_nome: autorNome,
      mensagem: texto.trim(),
    }])

    setEnviando(false)

    if (!error) {
      const msgTexto = texto.trim()
      setTexto('')

      // Gerar notificação para o outro lado (via API server-side)
      try {
        if (autorTipo === 'cliente') {
          // Cliente enviou → notificar consultor
          const { data: clienteData } = await supabase
            .from('clientes')
            .select('consultor_id, nome')
            .eq('id', clienteId)
            .maybeSingle()

          if (clienteData?.consultor_id) {
            fetch('/api/enviar-notificacao-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                destino: 'consultor',
                destino_id: clienteData.consultor_id,
                tipo: 'novo_cliente',
                titulo: `Nova mensagem de ${clienteData.nome || 'cliente'}`,
                mensagem: msgTexto.length > 100 ? msgTexto.substring(0, 100) + '...' : msgTexto,
                link: `/consultor/cliente/${clienteId}`,
                importancia: 'alta',
              }),
            }).catch(() => {})
          }
        } else if (autorTipo === 'consultor') {
          // Consultor enviou → notificar cliente
          fetch('/api/enviar-notificacao-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destino: 'cliente',
              destino_id: clienteId,
              tipo: 'mensagem',
              titulo: `Nova mensagem de ${autorNome || 'seu consultor'}`,
              mensagem: msgTexto.length > 100 ? msgTexto.substring(0, 100) + '...' : msgTexto,
              link: '/painel',
              importancia: 'alta',
            }),
          }).catch(() => {})
        }
      } catch {
        // Notificação é best-effort, não bloqueia o chat
      }
    }
  }

  if (carregando) return null

  return (
    <div className="flex flex-col h-[420px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {mensagens.length === 0 && (
          <p className="text-gray-400 text-sm text-center mt-10">
            {autorTipo === 'cliente' ? 'Envie uma mensagem para seu consultor.' : 'Nenhuma mensagem ainda.'}
          </p>
        )}
        {mensagens.map((msg) => {
          const minhaMensagem = msg.autor_tipo === autorTipo
          const ehAdmin = msg.autor_tipo === 'admin'
          return (
            <div key={msg.id} className={`flex ${minhaMensagem ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                ehAdmin ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                minhaMensagem ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
              }`}>
                {(!minhaMensagem || ehAdmin) && (
                  <p className={`text-xs font-semibold mb-0.5 ${ehAdmin ? 'text-amber-700' : 'opacity-70'}`}>
                    {ehAdmin ? `⚡ Suporte CarWise · ${msg.autor_nome}` : msg.autor_nome}
                  </p>
                )}
                <p className="text-sm break-words whitespace-pre-wrap">{msg.mensagem}</p>
                <p className={`text-[10px] mt-1 ${ehAdmin ? 'text-amber-600' : minhaMensagem ? 'text-blue-100' : 'text-gray-400'}`}>
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
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none transition"
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