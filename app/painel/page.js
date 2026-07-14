'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function Painel() {
  const router = useRouter()
  const [usuario, setUsuario] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarDados() {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        router.push('/login')
        return
      }

      const user = sessionData.session.user
      setUsuario(user)

      const { data: perfilData, error: perfilError } = await supabase
        .from('clientes')
        .select('*')
        .eq('auth_id', user.id)
        .single()

      if (perfilError) {
        setErro('Não foi possível carregar seu perfil: ' + perfilError.message)
      } else {
        setPerfil(perfilData)
      }

      setCarregando(false)
    }

    carregarDados()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50 p-10">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-900 mb-1">
              Olá, {perfil?.nome || usuario?.email}
            </h1>
            <p className="text-gray-500 text-sm">Seu painel CarWise</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-red-100 transition"
          >
            Sair
          </button>
        </div>

        {erro && (
          <p className="text-red-600 text-sm mb-4">{erro}</p>
        )}

        {perfil && (
          <div className="border-t border-gray-100 pt-6 space-y-3">
            <InfoRow label="Nome completo" value={perfil.nome} />
            <InfoRow label="CPF" value={perfil.cpf} />
            <InfoRow label="E-mail" value={perfil.email} />
            <InfoRow label="Telefone" value={perfil.telefone} />
            <InfoRow label="Cidade" value={perfil.cidade} />
            <InfoRow label="Estado" value={perfil.estado} />
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value || '—'}</span>
    </div>
  )
}