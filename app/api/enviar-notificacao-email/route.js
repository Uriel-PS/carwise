import { NextResponse } from 'next/server'
import { criarNotificacaoConsultor, criarNotificacaoCliente } from '../../lib/notificacaoHelper'

import { createClient } from '@supabase/supabase-js'

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

/**
 * API para criar notificações e opcionalmente disparar e-mail.
 * 
 * POST body: {
 *   destino: 'consultor' | 'cliente',
 *   destino_id: UUID,
 *   tipo: string,
 *   titulo: string,
 *   mensagem: string,
 *   link: string (opcional),
 *   importancia: 'baixa' | 'normal' | 'alta'
 * }
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)
      if (userError || !user) {
        return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 })
      }
    } else {
      // Por enquanto, permite requisições sem token para não quebrar chamadas antigas,
      // mas o ideal é que todos os fetches passem o token e possamos retornar 401 aqui.
      // return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const body = await request.json()
    const { destino, destino_id, tipo, titulo, mensagem, link, importancia } = body

    if (!destino || !destino_id || !titulo) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: destino, destino_id, titulo' },
        { status: 400 }
      )
    }

    let resultado

    if (destino === 'consultor') {
      resultado = await criarNotificacaoConsultor({
        consultor_id: destino_id,
        tipo,
        titulo,
        mensagem,
        link,
        importancia,
      })
    } else if (destino === 'cliente') {
      resultado = await criarNotificacaoCliente({
        cliente_id: destino_id,
        tipo,
        titulo,
        mensagem,
        link,
        importancia,
      })
    } else {
      return NextResponse.json({ error: 'Destino inválido' }, { status: 400 })
    }

    if (resultado.error) {
      return NextResponse.json({ error: resultado.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Erro inesperado: ' + err.message }, { status: 500 })
  }
}
