'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

const MENU_ITEMS = [
  { key: 'painel', label: 'Dashboard', icon: '🏠', href: '/consultor/painel' },
  { key: 'clientes', label: 'Meus Clientes', icon: '👥', href: '/consultor/clientes' },
  { key: 'pipeline', label: 'Pipeline', icon: '📋', href: '/consultor/pipeline' },
  { key: 'agenda', label: 'Agenda', icon: '📅', href: '/consultor/agenda' },
  { key: 'tarefas', label: 'Tarefas', icon: '✅', href: '/consultor/tarefas' },
  { key: 'comissoes', label: 'Comissões', icon: '💰', href: '/consultor/comissoes' },
  { key: 'desempenho', label: 'Desempenho', icon: '📊', href: '/consultor/desempenho' },
  { key: 'catalogo', label: 'Catálogo', icon: '🚗', href: '/consultor/catalogo' },
  { key: 'notificacoes', label: 'Notificações', icon: '🔔', href: '/consultor/notificacoes' },
]

const MENU_BOTTOM = [
  { key: 'config', label: 'Configurações', icon: '⚙️', href: '/consultor/config' },
]

export default function ConsultorLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [consultor, setConsultor] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [notificacoesCount, setNotificacoesCount] = useState(0)
  const [buscaGlobal, setBuscaGlobal] = useState('')

  // Skip layout for login page
  const isLoginPage = pathname === '/consultor/login'

  useEffect(() => {
    if (isLoginPage) {
      setCarregando(false)
      return
    }

    async function carregarConsultor() {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        router.push('/consultor/login')
        return
      }

      const user = sessionData.session.user

      const { data: consultorData } = await supabase
        .from('consultores')
        .select('*')
        .eq('auth_id', user.id)
        .eq('ativo', true)
        .maybeSingle()

      if (!consultorData) {
        router.push('/consultor/login')
        return
      }

      setConsultor(consultorData)

      // Try to load notifications count (table may not exist yet)
      try {
        const { count } = await supabase
          .from('notificacoes_consultor')
          .select('*', { count: 'exact', head: true })
          .eq('consultor_id', consultorData.id)
          .eq('lida', false)
        setNotificacoesCount(count || 0)
      } catch {
        setNotificacoesCount(0)
      }

      setCarregando(false)
    }

    carregarConsultor()
  }, [router, isLoginPage])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  if (isLoginPage) {
    return <>{children}</>
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Carregando painel...</p>
        </div>
      </div>
    )
  }

  function getActiveKey() {
    if (pathname === '/consultor/painel') return 'painel'
    if (pathname.startsWith('/consultor/clientes') || pathname.startsWith('/consultor/cliente/')) return 'clientes'
    if (pathname.startsWith('/consultor/pipeline') || pathname.startsWith('/consultor/negociacao')) return 'pipeline'
    if (pathname.startsWith('/consultor/agenda')) return 'agenda'
    if (pathname.startsWith('/consultor/tarefas')) return 'tarefas'
    if (pathname.startsWith('/consultor/comissoes')) return 'comissoes'
    if (pathname.startsWith('/consultor/desempenho')) return 'desempenho'
    if (pathname.startsWith('/consultor/catalogo')) return 'catalogo'
    if (pathname.startsWith('/consultor/notificacoes')) return 'notificacoes'
    if (pathname.startsWith('/consultor/config')) return 'config'
    return 'painel'
  }

  const activeKey = getActiveKey()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/consultor/login')
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-[100dvh]
          w-[260px] flex flex-col
          bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950
          border-r border-slate-800/50
          transition-transform duration-300 ease-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="px-6 py-5 flex items-center gap-3 border-b border-slate-800/50">
          <a href="/consultor/painel" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white text-sm font-black">CW</span>
            </div>
            <div>
              <h1 className="text-white font-[family-name:var(--font-display)] font-extrabold text-[17px] tracking-tight">CarWise</h1>
              <p className="text-slate-500 text-[10px] font-medium tracking-wider uppercase">Consultor</p>
            </div>
          </a>
          {/* Close button mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-auto text-slate-400 hover:text-white p-1"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Consultant info */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 bg-slate-800/40 rounded-xl px-3.5 py-3 border border-slate-700/30">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
              {consultor?.nome?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{consultor?.nome || 'Consultor'}</p>
              <p className="text-slate-500 text-[11px] truncate">{consultor?.email || ''}</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {MENU_ITEMS.map((item) => {
            const isActive = activeKey === item.key
            return (
              <a
                key={item.key}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative
                  ${isActive
                    ? 'bg-blue-600/15 text-blue-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full" />
                )}
                <span className="text-base w-6 text-center shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
                {item.key === 'notificacoes' && notificacoesCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                    {notificacoesCount > 99 ? '99+' : notificacoesCount}
                  </span>
                )}
              </a>
            )
          })}
        </nav>

        {/* Bottom menu */}
        <div className="px-3 py-3 border-t border-slate-800/50 space-y-0.5">
          {MENU_BOTTOM.map((item) => {
            const isActive = activeKey === item.key
            return (
              <a
                key={item.key}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-blue-600/15 text-blue-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }
                `}
              >
                <span className="text-base w-6 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            )
          })}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <span className="text-base w-6 text-center">🚪</span>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/70">
          <div className="flex items-center justify-between px-4 lg:px-8 h-[60px]">
            {/* Left: hamburger + search */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>

              <div className="relative hidden sm:block">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={buscaGlobal}
                  onChange={(e) => setBuscaGlobal(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 w-72 focus:border-blue-400 focus:outline-none focus:bg-white transition"
                />
              </div>
            </div>

            {/* Right: notifications + profile */}
            <div className="flex items-center gap-2">
              <a
                href="/consultor/notificacoes"
                className="relative p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {notificacoesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                    {notificacoesCount > 9 ? '9+' : notificacoesCount}
                  </span>
                )}
              </a>

              <div className="hidden sm:flex items-center gap-2.5 pl-2 ml-1 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {consultor?.nome?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{consultor?.nome}</p>
                  <p className="text-[10px] text-slate-400">Consultor</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
