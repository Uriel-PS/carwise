export default function Home() {
  return (
    <div className="bg-white text-gray-900">

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-2xl text-blue-950">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            CarWise
          </div>
          <nav className="hidden md:flex gap-8 text-sm text-gray-600 font-medium">
            <a href="#como-funciona" className="hover:text-blue-950 transition">Como funciona</a>
            <a href="#planos" className="hover:text-blue-950 transition">Planos</a>
            <a href="#ia" className="hover:text-blue-950 transition">Inteligência</a>
          </nav>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-semibold text-gray-500 hover:text-blue-950 transition">Entrar</a>
            <a href="/cadastro" className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 hover:-translate-y-0.5 transition">
              Começar agora
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-b from-blue-50 via-blue-50/40 to-white">
        <div className="max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-2.5 text-xs font-mono text-blue-600 uppercase tracking-widest mb-5">
              <span className="w-5 h-px bg-blue-600"></span>
              Consultoria automotiva pessoal
            </div>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-5xl md:text-6xl leading-[1.02] tracking-tight text-blue-950 mb-6">
              Compre um carro com <span className="text-blue-600">quem entende</span>, não sozinho.
            </h1>
            <p className="text-gray-500 text-lg mb-9 max-w-md leading-relaxed">
              Um consultor dedicado cuida da busca, da negociação, da vistoria e da documentação.
              Você só escolhe o carro — e sabe exatamente quanto vai gastar antes de assinar qualquer coisa.
            </p>
            <div className="flex gap-3.5 flex-wrap mb-9">
              <a href="/cadastro" className="bg-blue-600 text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-blue-700 hover:-translate-y-0.5 transition shadow-sm">
                Falar com um consultor
              </a>
              <a href="#planos" className="border border-gray-300 text-blue-950 font-semibold px-7 py-3.5 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition">
                Ver planos e preços
              </a>
            </div>
            <div className="flex gap-7 flex-wrap text-sm text-gray-400">
              <span><strong className="text-blue-950 font-mono font-medium">1.200+</strong> compras acompanhadas</span>
              <span><strong className="text-blue-950 font-mono font-medium">40+</strong> concessionárias parceiras</span>
            </div>
          </div>

          {/* Checklist card */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_30px_60px_-24px_rgba(10,34,71,0.18)] p-7">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
              <div>
                <div className="font-[family-name:var(--font-display)] font-semibold text-xl text-blue-950">Honda HR-V 2022</div>
                <div className="text-xs font-mono text-gray-400 tracking-wide">VISTORIA #4471 · JOINVILLE, SC</div>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-mono bg-green-50 text-green-600 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                em análise
              </span>
            </div>
            <ul className="space-y-1 text-sm">
              {['Motor sem vazamentos', 'Câmbio funcionando', 'Pintura original', 'Sem colisões na estrutura', 'Documentação regular'].map((item) => (
                <li key={item} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-blue-50/60 transition">
                  <span className="w-[18px] h-[18px] rounded-[5px] bg-blue-600 flex items-center justify-center text-white text-[10px] shrink-0">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  {item}
                </li>
              ))}
              {['Restrição financeira', 'Recall pendente'].map((item) => (
                <li key={item} className="flex items-center gap-3 py-2 px-2 text-gray-400">
                  <span className="w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-gray-300 shrink-0"></span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between items-center">
              <div className="text-xs font-mono text-gray-400">
                Confiabilidade: <strong className="text-blue-700 font-medium">8.7/10</strong>
              </div>
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 border-2 border-white flex items-center justify-center text-[10px] font-mono text-white font-medium">RC</div>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 border-2 border-white flex items-center justify-center text-[10px] font-mono text-white font-medium">MV</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 PONTAS DO ECOSSISTEMA */}
      <section className="bg-blue-50/40 border-y border-gray-200 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-14">
            <div className="text-xs font-mono text-amber-600 uppercase tracking-widest mb-3">O ecossistema</div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-4xl text-blue-950 mb-4 leading-tight">Um serviço, quatro pontas conectadas</h2>
            <p className="text-gray-500 text-base">Cliente, concessionária, vistoria e seguradora — cada um resolve um problema diferente dentro da mesma jornada de compra.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-px bg-gray-200 border border-gray-200 rounded-2xl overflow-hidden">
            {[
              {
                title: 'Consultoria para o comprador', desc: 'Planos de assinatura para busca, negociação e acompanhamento completo da compra.', tag: 'receita recorrente',
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12z" stroke="#2B5FE0" strokeWidth="1.6"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" stroke="#2B5FE0" strokeWidth="1.6" strokeLinecap="round"/></svg>,
                bg: 'bg-blue-50',
              },
              {
  title: 'Concessionárias parceiras', desc: 'Rede de concessionárias parceiras que agiliza sua escolha, com opções sempre atualizadas para o carro certo aparecer mais rápido.',
  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" stroke="#B07830" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  bg: 'bg-amber-50',
},
              {
                title: 'Avaliação mecânica', desc: 'Rede de oficinas parceiras credenciadas realiza a inspeção técnica completa.', tag: 'serviço avulso',
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 015.4-5.4l-3 3-2-2 3-3z" stroke="#3F9E6D" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
                bg: 'bg-green-50',
              },
              {
                title: 'Parcerias financeiras', desc: 'Seguro e financiamento cotados dentro do app, com comissão transparente informada ao cliente.', tag: 'comissão · opt-in',
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" stroke="#0A2247" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
                bg: 'bg-slate-100',
              },
            ].map((s) => (
              <div key={s.title} className="bg-white p-7 hover:bg-blue-50/40 transition">
                <div className={`w-10 h-10 rounded-[10px] ${s.bg} flex items-center justify-center mb-5`}>{s.icon}</div>
                <h3 className="font-[family-name:var(--font-display)] font-semibold text-lg text-blue-950 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 mb-5 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JORNADA - 6 PASSOS */}
      <section id="como-funciona" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-16">
            <div className="text-xs font-mono text-amber-600 uppercase tracking-widest mb-3">Jornada do cliente</div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-4xl text-blue-950 mb-4 leading-tight">Da entrevista inicial até a entrega das chaves</h2>
            <p className="text-gray-500 text-base">Cada etapa fica visível para você em tempo real — sem ligações perdidas ou "vou verificar e te retorno".</p>
          </div>

          <div className="flex flex-wrap justify-center gap-y-12">
            {[
              'Perfil e busca', 'Contato com o consultor', 'Negociação e vistoria',
	      'Test drive', 'Fechamento e contratos', 'Entrega e pós-venda',
            ].map((step, i) => (
              <div key={step} className="flex items-start">
                <div className="text-center w-[150px] px-1">
                  <div className="w-[38px] h-[38px] rounded-full bg-blue-600 text-white font-[family-name:var(--font-display)] font-bold text-base flex items-center justify-center mx-auto mb-4 shadow-[0_0_0_5px_rgba(43,95,224,0.1)]">
                    {i + 1}
                  </div>
                  <h4 className="font-[family-name:var(--font-display)] font-semibold text-[16.5px] text-blue-950 mb-1.5">{step}</h4>
                </div>
                {i < 5 && <span className="text-gray-300 text-2xl font-light mx-1 pt-1.5 hidden md:block">›</span>}
              </div>
            ))}
          </div>

          <div className="mt-16 bg-gradient-to-br from-blue-950 to-blue-800 rounded-2xl p-9 flex items-center gap-6 flex-col md:flex-row text-center md:text-left">
            <div className="w-13 h-13 rounded-xl bg-white/10 flex items-center justify-center shrink-0" style={{ width: 52, height: 52 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <h4 className="text-white font-[family-name:var(--font-display)] font-semibold text-xl mb-1.5">Nosso compromisso com você</h4>
              <p className="text-blue-100/80 text-sm max-w-xl">Preço honesto, atendimento respeitoso e um processo tranquilo do início ao fim. Estamos aqui antes, durante e depois da compra.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-24 bg-blue-50/30 border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-14">
            <div className="text-xs font-mono text-amber-600 uppercase tracking-widest mb-3">Planos para o cliente final</div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-4xl text-blue-950 mb-4 leading-tight">Escolha o quanto quer se envolver</h2>
            <p className="text-gray-500 text-base">Do acompanhamento pontual ao serviço completo, em que você só assina o contrato no final.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Básico', price: 'R$199', desc: 'Para quem já sabe o que quer e precisa de apoio pontual.', features: ['Pesquisa de mercado', 'Indicação de veículos', 'Análise documental'], featured: false },
              { name: 'Premium', price: 'R$499', desc: 'Acompanhamento de negociação e vistoria completa.', features: ['Pesquisa completa', 'Negociação conduzida pelo consultor', 'Vistoria e avaliação mecânica', 'Acompanhamento presencial'], featured: true },
              { name: 'Concierge', price: 'R$999', desc: 'Você escolhe o carro. O resto é com a gente.', features: ['Tudo do plano Premium', 'Test drive agendado e conduzido', 'Transferência e documentação completa', 'Suporte pós-venda'], featured: false },
            ].map((p) => (
              <div key={p.name} className={`relative bg-white rounded-2xl p-8 border flex flex-col ${p.featured ? 'border-blue-600 shadow-lg' : 'border-gray-200'}`}>
                {p.featured && (
                  <div className="absolute -top-px right-6 text-[10.5px] font-mono font-medium bg-blue-600 text-white px-3 py-1 rounded-b-md">
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
                <a href="/cadastro" className={`block text-center rounded-lg py-3.5 font-semibold text-sm transition ${p.featured ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-300 text-blue-950 hover:border-blue-400 hover:bg-blue-50'}`}>
                  Escolher {p.name}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IA */}
      <section id="ia" className="py-24">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-xs font-mono text-amber-600 uppercase tracking-widest mb-3">Inteligência artificial</div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-4xl text-blue-950 mb-5 leading-tight">A IA prepara o terreno antes do consultor falar com você</h2>
            <p className="text-gray-500 text-base mb-6 leading-relaxed">
              Antes de qualquer indicação, o sistema busca primeiro no estoque das concessionárias parceiras — e só depois expande para o mercado aberto. Também cruza preço FIPE, consumo e custo de manutenção.
            </p>
            <ul className="space-y-3">
              {['Prioridade para veículos cadastrados por parceiros', 'Simulação de parcela ideal e comprometimento de renda', 'Nota de confiabilidade por modelo'].map((item) => (
                <li key={item} className="flex gap-2.5 text-[14.5px] text-gray-600">
                  <span className="text-blue-600 shrink-0">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 font-mono text-sm shadow-sm">
            <div className="text-gray-400 border-b border-gray-100 pb-3.5 mb-3.5">
              <strong className="text-blue-950 font-medium">Perfil buscado:</strong> SUV automático · até R$ 120.000
            </div>
            {[
              ['Honda HR-V EXL 2022', '9.4', true],
              ['Jeep Renegade Longitude 2023', '9.0', true],
              ['Nissan Kicks SV 2021', '8.6', true],
              ['Toyota Corolla Cross 2022', '7.9', false],
            ].map(([car, score, partner]) => (
              <div key={car} className="flex justify-between items-center py-2.5 border-b border-dashed border-gray-100 last:border-0">
                <span className="text-gray-800">
                  {car}{' '}
                  {partner
                    ? <span className="text-amber-600 text-[10px]">● AutoPrime</span>
                    : <span className="text-gray-400 text-[10px]">mercado aberto</span>}
                </span>
                <span className="text-green-600 font-medium">{score}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-blue-50/30 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-xl text-blue-950 mb-3">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                CarWise
              </div>
              <p className="text-[13.5px] text-gray-400 max-w-xs leading-relaxed">Consultoria automotiva pessoal — da escolha do carro à entrega das chaves.</p>
            </div>
            <div>
              <h5 className="text-xs uppercase text-gray-400 font-semibold tracking-wide mb-4">Cliente</h5>
              <a href="#planos" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5">Planos</a>
              <a href="#como-funciona" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5">Como funciona</a>
              <a href="#ia" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5">Inteligência artificial</a>
            </div>
            <div>
              <h5 className="text-xs uppercase text-gray-400 font-semibold tracking-wide mb-4">Parceiros</h5>
              <a href="/contato?assunto=concessionaria" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5">Seja concessionária parceira</a>
              <a href="/contato?assunto=oficina" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5">Credenciar oficina</a>
              <a href="/contato?assunto=seguradora" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5">Seguradoras e bancos</a>
            </div>
            <div>
              <h5 className="text-xs uppercase text-gray-400 font-semibold tracking-wide mb-4">Empresa</h5>
	      <a href="/quem-somos" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5">Sobre</a>
              <a href="/contato?assunto=trabalhe" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5">Trabalhe conosco</a>
              <a href="/contato?assunto=outro" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5">Contato</a>
              <a href="/acesso-interno" className="block text-sm text-gray-600 hover:text-blue-700 mb-2.5">Acesso interno</a>
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