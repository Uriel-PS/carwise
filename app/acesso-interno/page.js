export default function AcessoInterno() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <header className="py-8">
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
          <a href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-2xl text-blue-950">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            CarWise
          </a>
          <span className="text-xs font-mono text-gray-400 tracking-widest uppercase">Portal de acesso</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2.5 text-xs font-mono text-blue-600 uppercase tracking-widest mb-4">
            <span className="w-5 h-px bg-blue-600 opacity-50"></span>
            Acesso interno
            <span className="w-5 h-px bg-blue-600 opacity-50"></span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] font-bold text-4xl text-blue-950 mb-3">
            Painéis da equipe CarWise
          </h1>
          <p className="text-gray-500 text-base">Selecione o painel correspondente ao seu perfil de acesso.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5 w-full max-w-3xl">
          <CardAcesso
            href="/consultor/login"
            titulo="Consultor"
            descricao="Gerencie clientes, negociações e o estoque de veículos."
            bg="bg-slate-100"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="#0A2247" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h11" stroke="#0A2247" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            }
          />
          <CardAcesso
            href="/concessionaria/login"
            titulo="Concessionária"
            descricao="Cadastre veículos do seu estoque e receba leads."
            bg="bg-amber-50"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" stroke="#B07830" strokeWidth="1.6" strokeLinejoin="round"/></svg>
            }
          />
          <CardAcesso
            href="/admin/login"
            titulo="Administrador"
            descricao="Gestão de consultores, parceiros e indicadores."
            bg="bg-green-50"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2l7.5 4v6c0 5-3.5 8.5-7.5 10-4-1.5-7.5-5-7.5-10V6l7.5-4z" stroke="#3F9E6D" strokeWidth="1.6" strokeLinejoin="round"/></svg>
            }
          />
        </div>

        <a href="/" className="text-sm text-gray-400 hover:text-blue-600 transition mt-12 font-medium">
          ← Voltar para o site
        </a>
      </main>
    </div>
  )
}

function CardAcesso({ href, titulo, descricao, bg, icon }) {
  return (
    <a
      href={href}
      className="bg-white border border-gray-100 rounded-2xl p-7 text-left hover:border-blue-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-16px_rgba(43,95,224,0.25)] transition-all"
    >
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-5`}>
        {icon}
      </div>
      <h3 className="font-[family-name:var(--font-display)] font-semibold text-xl text-blue-950 mb-1.5">{titulo}</h3>
      <p className="text-[13px] text-gray-400 mb-5 leading-relaxed">{descricao}</p>
      <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-600">
        Entrar
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
    </a>
  )
}