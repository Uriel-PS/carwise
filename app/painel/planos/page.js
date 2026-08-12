'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import MenuPerfil from '../../components/MenuPerfil'

const PLANOS = [
  { nome: 'Básico', valor: 199, descricao: 'Pesquisa de mercado, indicação de veículos e análise documental.' },
  { nome: 'Premium', valor: 499, descricao: 'Negociação conduzida pelo consultor e vistoria mecânica.' },
  { nome: 'Concierge', valor: 999, descricao: 'Test drive conduzido e documentação completa de ponta a ponta.' },
]

export default function PlanosPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [planoAtivo, setPlanoAtivo] = useState(null)

  useEffect(() => {
    async function carregarDados() {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        router.push('/login')
        return
      }

      const user = sessionData.session.user
      setUsuario(user)

      const { data: perfilData } = await supabase
        .from('clientes')
        .select('*')
        .eq('auth_id', user.id)
        .single()

      if (perfilData) {
        setPerfil(perfilData)

        const { data: pagamentoConfirmado } = await supabase
          .from('pagamentos')
          .select('*')
          .eq('cliente_id', perfilData.id)
          .eq('status', 'confirmado')
          .maybeSingle()

        if (pagamentoConfirmado) {
          setPlanoAtivo(pagamentoConfirmado.plano)
        }
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
        <p className="text-gray-400 text-sm">Carregando planos...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white/90 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/painel" className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-xl text-blue-950 hover:opacity-80 transition">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            CarWise
          </a>
          <MenuPerfil nome={perfil?.nome || usuario?.email} onLogout={handleLogout} />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="font-[family-name:var(--font-display)] font-bold text-3xl text-blue-950 mb-3">
            Planos e Serviços
          </h1>
          <p className="text-gray-500">
            Conheça as opções disponíveis e veja qual se encaixa melhor na sua busca.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANOS.map((plano) => {
            const isAtivo = planoAtivo === plano.nome

            return (
              <div 
                key={plano.nome} 
                className={`relative bg-white border rounded-2xl p-6 shadow-sm flex flex-col ${
                  isAtivo ? 'border-blue-500 ring-1 ring-blue-500/20 shadow-blue-900/5' : 'border-gray-100'
                }`}
              >
                {isAtivo && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    Plano Atual
                  </div>
                )}
                
                <h2 className="font-[family-name:var(--font-display)] font-semibold text-xl text-blue-950 mb-2 mt-2">
                  {plano.nome}
                </h2>
                <p className="text-3xl font-bold text-blue-950 mb-4">
                  R${plano.valor}
                </p>
                <p className="text-sm text-gray-600 mb-6 flex-1">
                  {plano.descricao}
                </p>
                
                {isAtivo ? (
                  <button disabled className="w-full bg-blue-50 text-blue-700 font-semibold py-2.5 rounded-xl cursor-default">
                    Contratado
                  </button>
                ) : (
                  <a href="/painel" className="block text-center w-full bg-white border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition">
                    Voltar ao painel
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
