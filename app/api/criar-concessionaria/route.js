import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 })
    }

    // Verificar se o usuário é admin
    const { data: adminData } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('auth_id', user.id)
      .eq('ativo', true)
      .maybeSingle()

    if (!adminData) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' }, { status: 403 })
    }

    const { razao_social, nome_fantasia, cnpj, email, senha, telefone, cidade, estado, responsavel } = await request.json()

    if (!razao_social || !nome_fantasia || !cnpj || !email || !senha) {
      return NextResponse.json({ error: 'Razão social, nome fantasia, CNPJ, e-mail e senha são obrigatórios.' }, { status: 400 })
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const { error: insertError } = await supabaseAdmin
      .from('concessionarias')
      .insert([{
        auth_id: authData.user.id,
        razao_social,
        nome_fantasia,
        cnpj,
        email,
        telefone,
        cidade,
        estado,
        responsavel,
        ativo: true,
      }])

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Erro inesperado: ' + err.message }, { status: 500 })
  }
}