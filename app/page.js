'use client'

import { useEffect, useRef, useState } from 'react'
import MeshBackground from './components/MeshBackground'

/* ── Animated counter hook ── */
function useCounter(target, duration = 2000) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1)
          const ease = 1 - Math.pow(1 - progress, 3)
          setCount(Math.floor(ease * target))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [target, duration])

  return [count, ref]
}

/* ── Scroll-reveal hook ── */
function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible')
          obs.unobserve(el)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [headerScrolled, setHeaderScrolled] = useState(false)

  // Scroll-reveal refs
  const heroRef = useReveal()
  const ecosystemHeaderRef = useReveal()
  const ecosystemGridRef = useReveal()
  const journeyHeaderRef = useReveal()
  const journeyStepsRef = useReveal()
  const commitmentRef = useReveal()
  const plansHeaderRef = useReveal()
  const plansGridRef = useReveal()
  const iaRef = useReveal()
  const footerRef = useReveal()

  // Animated counters
  const [compras, comprasRef] = useCounter(1200, 2200)
  const [parceiras, parceirasRef] = useCounter(40, 1600)

  // Header scroll effect
  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="bg-white text-gray-900 overflow-x-hidden">

      {/* ══════════ ANIMATED PARTICLE BACKGROUND ══════════ */}
      <MeshBackground />

      {/* ══════════ HEADER ══════════ */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          headerScrolled
            ? 'bg-white/95 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border-b border-gray-200/60'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-2xl text-blue-950 group">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 group-hover:scale-125 transition-transform duration-300"></span>
            CarWise
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-8 text-sm text-gray-500 font-medium">
            {[
              ['#como-funciona', 'Como funciona'],
              ['#planos', 'Planos'],
              ['#ia', 'Inteligência'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="relative py-1 hover:text-blue-950 transition-colors duration-300 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-blue-600 after:rounded-full after:transition-all after:duration-300 hover:after:w-full">
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <a href="/login" className="text-sm font-semibold text-gray-500 hover:text-blue-950 transition-colors duration-300 hidden sm:block">
              Entrar
            </a>
            <a href="/cadastro" className="btn-shimmer bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/25 transition-all duration-300">
              Começar agora
            </a>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col gap-[5px] p-2 -mr-2"
              aria-label="Menu"
            >
              <span className={`w-5 h-[2px] bg-blue-950 rounded-full transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`w-5 h-[2px] bg-blue-950 rounded-full transition-all duration-300 ${mobileMenuOpen ? 'opacity-0 scale-x-0' : ''}`} />
              <span className={`w-5 h-[2px] bg-blue-950 rounded-full transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`mobile-menu md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl ${mobileMenuOpen ? 'open' : ''}`}>
          <nav className="max-w-6xl mx-auto px-5 py-4 flex flex-col gap-3">
            {[
              ['#como-funciona', 'Como funciona'],
              ['#planos', 'Planos'],
              ['#ia', 'Inteligência'],
              ['/login', 'Entrar'],
            ].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-600 hover:text-blue-950 py-2 transition-colors">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* ══════════ HERO ══════════ */}
      <section className="relative overflow-hidden" style={{ background: 'transparent' }}>
        <div ref={heroRef} className="reveal max-w-3xl mx-auto px-5 sm:px-6 py-20 sm:py-28 md:py-32 text-center relative z-10">
          <div className="flex items-center justify-center gap-2.5 text-xs font-mono text-blue-600 uppercase tracking-widest mb-5">
            <span className="w-5 h-px bg-blue-600" />
            Consultoria automotiva pessoal
            <span className="w-5 h-px bg-blue-600" />
          </div>

          <h1 className="font-[family-name:var(--font-display)] font-bold text-4xl sm:text-5xl md:text-6xl leading-[1.05] tracking-tight text-blue-950 mb-6">
            Compre um carro com{' '}
            <span className="gradient-text">quem entende</span>, não sozinho.
          </h1>

          <p className="text-gray-500 text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Um consultor dedicado cuida da busca, da negociação, da vistoria e da documentação.
            Você só escolhe o carro, e sabe exatamente quanto vai gastar antes de assinar qualquer coisa.
          </p>

          <div className="flex gap-3.5 flex-wrap justify-center mb-10">
            <a href="/cadastro" className="btn-shimmer bg-blue-600 text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-blue-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-600/25 transition-all duration-300 shadow-sm">
              Falar com um consultor
            </a>
            <a href="#planos" className="border border-gray-300 text-blue-950 font-semibold px-7 py-3.5 rounded-xl hover:border-blue-400 hover:bg-blue-50 hover:-translate-y-0.5 transition-all duration-300">
              Ver planos e preços
            </a>
          </div>

          {/* Animated stats */}
          <div className="flex gap-8 sm:gap-12 flex-wrap justify-center text-sm text-gray-400">
            <span ref={comprasRef}>
              <strong className="text-blue-950 font-mono font-semibold text-lg tabular-nums">{compras.toLocaleString('pt-BR')}+</strong>
              <br className="sm:hidden" />{' '}compras acompanhadas
            </span>
            <span ref={parceirasRef}>
              <strong className="text-blue-950 font-mono font-semibold text-lg tabular-nums">{parceiras}+</strong>
              <br className="sm:hidden" />{' '}concessionárias parceiras
            </span>
          </div>
        </div>
      </section>

      {/* ══════════ 4 PONTAS DO ECOSSISTEMA ══════════ */}
      <section className="section-glass-alt border-y border-gray-200/60 py-20 sm:py-24 relative z-[1]">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div ref={ecosystemHeaderRef} className="reveal max-w-xl mb-14">
            <div className="text-xs font-mono text-amber-600 uppercase tracking-widest mb-3">O ecossistema</div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-3xl sm:text-4xl text-blue-950 mb-4 leading-tight">Um serviço, quatro pontas conectadas</h2>
            <p className="text-gray-500 text-base">Cliente, concessionária, vistoria e seguradora: cada um resolve um problema diferente dentro da mesma jornada de compra.</p>
          </div>

          <div ref={ecosystemGridRef} className="stagger-children grid sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {[
              {
                title: 'Consultoria para o comprador',
                desc: 'Planos de assinatura para busca, negociação e acompanhamento completo da compra.',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12z" stroke="#2B5FE0" strokeWidth="1.6"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" stroke="#2B5FE0" strokeWidth="1.6" strokeLinecap="round"/></svg>,
                gradient: 'from-blue-500/10 to-blue-600/5',
                iconBg: 'bg-blue-100',
              },
              {
                title: 'Concessionárias parceiras',
                desc: 'Rede que agiliza sua escolha, com opções sempre atualizadas para o carro certo aparecer mais rápido.',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" stroke="#B07830" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
                gradient: 'from-amber-500/10 to-amber-600/5',
                iconBg: 'bg-amber-100',
              },
              {
                title: 'Avaliação mecânica',
                desc: 'Rede de oficinas parceiras credenciadas realiza a inspeção técnica completa.',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 015.4-5.4l-3 3-2-2 3-3z" stroke="#3F9E6D" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
                gradient: 'from-green-500/10 to-green-600/5',
                iconBg: 'bg-green-100',
              },
              {
                title: 'Parcerias financeiras',
                desc: 'Seguro e financiamento cotados dentro do app, com comissão transparente informada ao cliente.',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" stroke="#0A2247" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
                gradient: 'from-slate-500/10 to-slate-600/5',
                iconBg: 'bg-slate-100',
              },
            ].map((s) => (
              <div
                key={s.title}
                className={`card-hover bg-gradient-to-br ${s.gradient} bg-white rounded-2xl p-7 border border-gray-100`}
              >
                <div className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center mb-5`}>
                  {s.icon}
                </div>
                <h3 className="font-[family-name:var(--font-display)] font-semibold text-lg text-blue-950 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ JORNADA - 6 PASSOS ══════════ */}
      <section id="como-funciona" className="section-glass py-20 sm:py-24 relative z-[1]">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div ref={journeyHeaderRef} className="reveal max-w-xl mb-16">
            <div className="text-xs font-mono text-amber-600 uppercase tracking-widest mb-3">Jornada do cliente</div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-3xl sm:text-4xl text-blue-950 mb-4 leading-tight">Da entrevista inicial até a entrega das chaves</h2>
            <p className="text-gray-500 text-base">Cada etapa fica visível para você em tempo real, sem ligações perdidas ou &quot;vou verificar e te retorno&quot;.</p>
          </div>

          <div ref={journeyStepsRef} className="stagger-children grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 sm:gap-4">
            {[
              ['Perfil e busca', '🔍'],
              ['Contato com o consultor', '💬'],
              ['Negociação e vistoria', '🔧'],
              ['Test drive', '🚗'],
              ['Fechamento e contratos', '📋'],
              ['Entrega e pós-venda', '🔑'],
            ].map(([step, emoji], i) => (
              <div key={step} className="step-connector text-center group">
                <div className="relative mx-auto mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-[family-name:var(--font-display)] font-bold text-lg flex items-center justify-center mx-auto shadow-lg shadow-blue-600/20 group-hover:shadow-blue-600/40 group-hover:scale-110 transition-all duration-300">
                    {i + 1}
                  </div>
                </div>
                <div className="text-xl mb-2">{emoji}</div>
                <h4 className="font-[family-name:var(--font-display)] font-semibold text-[15px] sm:text-base text-blue-950 leading-snug">{step}</h4>
              </div>
            ))}
          </div>

          <div ref={commitmentRef} className="reveal from-scale mt-16 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 rounded-2xl p-8 sm:p-9 flex items-center gap-6 flex-col md:flex-row text-center md:text-left relative overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 relative">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="relative">
              <h4 className="text-white font-[family-name:var(--font-display)] font-semibold text-xl mb-1.5">Nosso compromisso com você</h4>
              <p className="text-blue-100/70 text-sm max-w-xl leading-relaxed">Preço honesto, atendimento respeitoso e um processo tranquilo do início ao fim. Estamos aqui antes, durante e depois da compra.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ PLANOS ══════════ */}
      <section id="planos" className="section-glass-alt py-20 sm:py-24 border-y border-gray-200/60 relative z-[1]">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div ref={plansHeaderRef} className="reveal max-w-xl mb-14">
            <div className="text-xs font-mono text-amber-600 uppercase tracking-widest mb-3">Planos para o cliente final</div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-3xl sm:text-4xl text-blue-950 mb-4 leading-tight">Escolha o quanto quer se envolver</h2>
            <p className="text-gray-500 text-base">Do acompanhamento pontual ao serviço completo, em que você só assina o contrato no final.</p>
          </div>

          <div ref={plansGridRef} className="stagger-children grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[
              {
                name: 'Básico', price: 'R$199',
                desc: 'Para quem já sabe o que quer e precisa de apoio pontual.',
                features: ['Pesquisa de mercado', 'Indicação de veículos', 'Análise documental'],
                featured: false,
              },
              {
                name: 'Premium', price: 'R$499',
                desc: 'Acompanhamento de negociação e vistoria completa.',
                features: ['Pesquisa completa', 'Negociação conduzida pelo consultor', 'Vistoria e avaliação mecânica', 'Acompanhamento presencial'],
                featured: true,
              },
              {
                name: 'Concierge', price: 'R$999',
                desc: 'Você escolhe o carro. O resto é com a gente.',
                features: ['Tudo do plano Premium', 'Test drive agendado e conduzido', 'Transferência e documentação completa', 'Suporte pós-venda'],
                featured: false,
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`plan-shine card-hover relative bg-white rounded-2xl p-8 border flex flex-col ${
                  p.featured
                    ? 'border-blue-600 shadow-xl shadow-blue-600/10 md:scale-105'
                    : 'border-gray-200'
                }`}
              >
                {p.featured && (
                  <div className="absolute -top-px right-6 text-[10.5px] font-mono font-medium bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3.5 py-1.5 rounded-b-lg">
                    MAIS ESCOLHIDO
                  </div>
                )}
                <div className="text-[13px] uppercase tracking-wider text-gray-400 font-semibold mb-2.5">{p.name}</div>
                <div className="font-[family-name:var(--font-display)] font-bold text-5xl text-blue-950 mb-1">{p.price}</div>
                <div className="text-[13.5px] text-gray-400 mb-6">{p.desc}</div>
                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm text-gray-600">
                      <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="#2B5FE0" strokeWidth="1.6"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="/cadastro"
                  className={`btn-shimmer block text-center rounded-xl py-3.5 font-semibold text-sm transition-all duration-300 ${
                    p.featured
                      ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25'
                      : 'border border-gray-300 text-blue-950 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  Escolher {p.name}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ IA ══════════ */}
      <section id="ia" className="section-glass py-20 sm:py-24 relative z-[1]">
        <div ref={iaRef} className="reveal max-w-3xl mx-auto px-5 sm:px-6 text-center">
          <div className="text-xs font-mono text-amber-600 uppercase tracking-widest mb-3">Inteligência artificial</div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-3xl sm:text-4xl text-blue-950 mb-5 leading-tight">A IA prepara o terreno antes do consultor falar com você</h2>
          <p className="text-gray-500 text-base mb-8 max-w-xl mx-auto leading-relaxed">
            Antes de qualquer indicação, o sistema busca primeiro no estoque das concessionárias parceiras, e só depois expande para o mercado aberto. Também cruza preço FIPE, consumo e custo de manutenção.
          </p>
          <div className="inline-flex flex-col items-start gap-4 text-left">
            {[
              ['Prioridade para veículos cadastrados por parceiros', '🏢'],
              ['Simulação de parcela ideal e comprometimento de renda', '💰'],
              ['Nota de confiabilidade por modelo', '⭐'],
            ].map(([item, emoji]) => (
              <div key={item} className="flex items-center gap-3 text-[14.5px] text-gray-600 bg-blue-50/60 px-5 py-3 rounded-xl hover:bg-blue-50 transition-colors duration-300 w-full">
                <span className="text-lg">{emoji}</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t border-gray-200/60 section-glass py-14 sm:py-16 relative z-[1]">
        <div ref={footerRef} className="reveal max-w-6xl mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-xl text-blue-950 mb-3">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                CarWise
              </div>
              <p className="text-[13.5px] text-gray-400 max-w-xs leading-relaxed">Consultoria automotiva pessoal, da escolha do carro à entrega das chaves.</p>
            </div>
            <div>
              <h5 className="text-xs uppercase text-gray-400 font-semibold tracking-wide mb-4">Cliente</h5>
              <a href="#planos" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5 transition-colors">Planos</a>
              <a href="#como-funciona" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5 transition-colors">Como funciona</a>
              <a href="#ia" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5 transition-colors">Inteligência artificial</a>
            </div>
            <div>
              <h5 className="text-xs uppercase text-gray-400 font-semibold tracking-wide mb-4">Parceiros</h5>
              <a href="/contato?assunto=concessionaria" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5 transition-colors">Seja concessionária parceira</a>
              <a href="/contato?assunto=oficina" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5 transition-colors">Credenciar oficina</a>
              <a href="/contato?assunto=seguradora" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5 transition-colors">Seguradoras e bancos</a>
            </div>
            <div>
              <h5 className="text-xs uppercase text-gray-400 font-semibold tracking-wide mb-4">Empresa</h5>
              <a href="/quem-somos" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5 transition-colors">Sobre</a>
              <a href="/contato?assunto=trabalhe" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5 transition-colors">Trabalhe conosco</a>
              <a href="/contato?assunto=outro" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5 transition-colors">Contato</a>
              <a href="/acesso-interno" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5 transition-colors">Acesso interno</a>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-6 text-xs text-gray-400 flex justify-between flex-wrap gap-2">
            <span>© 2026 CarWise. Joinville, SC.</span>
            <span>Feito para quem compra apenas uma ou duas vezes na vida.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}