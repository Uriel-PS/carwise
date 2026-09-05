import { NextResponse } from 'next/server'
import { criarNotificacaoConsultor, criarNotificacaoCliente } from '../../lib/notificacaoHelper'

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
