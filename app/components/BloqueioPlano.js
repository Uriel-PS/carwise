export default function BloqueioPlano({ titulo }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5 text-center">
      <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="1.5" stroke="#2B5FE0" strokeWidth="1.6"/><path d="M8 11V8a4 4 0 018 0v3" stroke="#2B5FE0" strokeWidth="1.6" strokeLinecap="round"/></svg>
      </div>
      <h3 className="font-[family-name:var(--font-display)] font-semibold text-blue-950 text-lg mb-2">{titulo}</h3>
      <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
        Essa funcionalidade fica disponível assim que você escolhe um plano e o pagamento é confirmado.
      </p>
      <a
        href="#pagamento"
        className="inline-block bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition"
      >
        Ver planos disponíveis
      </a>
    </div>
  )
}