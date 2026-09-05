'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'

/**
 * Hook de notificações em tempo real via Supabase Realtime
 * 
 * @param {Object} config
 * @param {string} config.tabela - Nome da tabela (ex: 'notificacoes_consultor' ou 'notificacoes_cliente')
 * @param {string} config.colunaId - Nome da coluna de filtro (ex: 'consultor_id' ou 'cliente_id')
 * @param {string} config.valorId - Valor do ID para filtrar
 * @param {boolean} config.habilitado - Se o hook deve estar ativo (default true)
 * @returns {{ notificacoes, naoLidas, carregando, marcarComoLida, marcarTodasComoLidas, novaNotificacao }}
 */
export function useNotificacoesRealtime({ tabela, colunaId, valorId, habilitado = true }) {
  const [notificacoes, setNotificacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [novaNotificacao, setNovaNotificacao] = useState(null)
  const notificacaoTimerRef = useRef(null)

  // Carregar notificações iniciais
  const carregar = useCallback(async () => {
    if (!valorId || !habilitado) return

    try {
      const { data, error } = await supabase
        .from(tabela)
        .select('*')
        .eq(colunaId, valorId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!error && data) {
        setNotificacoes(data)
      }
    } catch {
      // Tabela pode não existir ainda
    }
    setCarregando(false)
  }, [tabela, colunaId, valorId, habilitado])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Assinatura realtime
  useEffect(() => {
    if (!valorId || !habilitado) return

    const canalId = `${tabela}-${valorId}-${Math.random().toString(36).substring(7)}`
    const canal = supabase
      .channel(canalId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tabela,
          filter: `${colunaId}=eq.${valorId}`,
        },
        (payload) => {
          const nova = payload.new
          setNotificacoes((prev) => [nova, ...prev])

          // Sinalizar nova notificação (para toast)
          setNovaNotificacao(nova)
          if (notificacaoTimerRef.current) clearTimeout(notificacaoTimerRef.current)
          notificacaoTimerRef.current = setTimeout(() => setNovaNotificacao(null), 6000)

          // Notificação do browser (se aba não estiver em foco)
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(nova.titulo || 'Nova notificação', {
                body: nova.mensagem || '',
                icon: '/favicon.ico',
                tag: `carwise-${nova.id}`,
              })
            } catch {
              // Silently fail if notification creation fails
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tabela,
          filter: `${colunaId}=eq.${valorId}`,
        },
        (payload) => {
          const atualizada = payload.new
          setNotificacoes((prev) =>
            prev.map((n) => (n.id === atualizada.id ? atualizada : n))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [tabela, colunaId, valorId, habilitado])

  // Solicitar permissão para notificações do browser
  useEffect(() => {
    if (habilitado && 'Notification' in window && Notification.permission === 'default') {
      // Delay para não pedir permissão imediatamente
      const timer = setTimeout(() => {
        Notification.requestPermission()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [habilitado])

  const naoLidas = notificacoes.filter((n) => !n.lida).length

  const marcarComoLida = useCallback(async (id) => {
    await supabase.from(tabela).update({ lida: true }).eq('id', id)
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)))
  }, [tabela])

  const marcarTodasComoLidas = useCallback(async () => {
    if (!valorId) return
    await supabase
      .from(tabela)
      .update({ lida: true })
      .eq(colunaId, valorId)
      .eq('lida', false)

    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
  }, [tabela, colunaId, valorId])

  const excluirNotificacao = useCallback(async (id) => {
    await supabase.from(tabela).delete().eq('id', id)
    setNotificacoes((prev) => prev.filter((n) => n.id !== id))
  }, [tabela])

  const limparNovaNotificacao = useCallback(() => {
    setNovaNotificacao(null)
  }, [])

  return {
    notificacoes,
    naoLidas,
    carregando,
    marcarComoLida,
    marcarTodasComoLidas,
    excluirNotificacao,
    novaNotificacao,
    limparNovaNotificacao,
  }
}
