export default function QuemSomos() {
  return (
    <div className="bg-white text-gray-900">

      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-2xl text-blue-950">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            CarWise
          </a>
          <nav className="hidden md:flex gap-8 text-sm text-gray-600 font-medium">
            <a href="/#como-funciona" className="hover:text-blue-950 transition">Como funciona</a>
            <a href="/#planos" className="hover:text-blue-950 transition">Planos</a>
            <a href="/quem-somos" className="text-blue-600">Quem somos</a>
          </nav>
          <a href="/cadastro" className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition">
            Começar agora
          </a>
        </div>
      </header>

      <section className="bg-gradient-to-b from-blue-50 to-white py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="text-xs font-mono text-blue-600 uppercase tracking-widest mb-4">Quem somos</div>
          <h1 className="font-[family-name:var(--font-display)] font-bold text-4xl md:text-5xl text-blue-950 mb-6 leading-tight">
            Um personal shopper para o mercado automotivo
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            A maioria das pessoas compra um carro apenas uma ou duas vezes na vida. Não é justo esperar
            que todo mundo saiba avaliar um motor, negociar preço ou entender documentação. Por isso existimos.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 space-y-14">

          <div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl text-blue-950 mb-3">Por que o CarWise existe</h2>
            <p className="text-gray-600 leading-relaxed">
              Hoje o comprador de carro está sozinho. Pesquisa em vários sites, negocia sem saber se o preço é justo,
              e só descobre problemas mecânicos depois da compra. O CarWise nasceu para colocar um consultor de
              verdade ao lado do cliente em cada etapa — da escolha do modelo ideal até a entrega das chaves.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl text-blue-950 mb-3">Como pensamos</h2>
            <p className="text-gray-600 leading-relaxed">
              Não vendemos carros. Vendemos segurança, tempo e redução de risco. Trabalhamos com concessionárias
              parceiras, oficinas credenciadas e um processo transparente — o cliente sabe exatamente quanto vai
              gastar antes de assinar qualquer coisa.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl text-blue-950 mb-3">Para quem é o CarWise</h2>
            <p className="text-gray-600 leading-relaxed">
              Para quem está comprando o primeiro carro e não sabe por onde começar. Para quem tem pouco tempo
              disponível para pesquisar e negociar. E para quem já foi enganado antes e quer ter certeza da
              próxima vez.
            </p>
          </div>

        </div>
      </section>

      <section className="py-20 bg-blue-50/40 border-y border-gray-200">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-3xl text-blue-950 mb-4">
            Pronto para comprar com quem entende?
          </h2>
          <a href="/cadastro" className="inline-block bg-blue-600 text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-blue-700 transition mt-4">
            Falar com um consultor
          </a>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-blue-50/30 py-10">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-gray-400">
          © 2026 CarWise. Joinville, SC.
        </div>
      </footer>
    </div>
  )
}