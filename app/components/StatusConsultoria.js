const ETAPAS = [
  { chave: 'cadastro', label: 'Cadastro' },
  { chave: 'buscando', label: 'Buscando veículos' },
  { chave: 'negociando', label: 'Em negociação' },
  { chave: 'documentacao', label: 'Documentação' },
  { chave: 'entrega', label: 'Entrega' },
]

export default function StatusConsultoria({ etapaAtual }) {
  const indiceAtual = ETAPAS.findIndex((e) => e.chave === etapaAtual)
  const indice = indiceAtual === -1 ? 0 : indiceAtual

  return (
    <div className="flex items-center gap-1">
      {ETAPAS.map((etapa, i) => (
        <div key={etapa.chave} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full shrink-0 ${
              i < indice ? 'bg-blue-600' :
              i === indice ? 'bg-blue-600 ring-4 ring-blue-100' :
              'bg-gray-200'
            }`} />
            <span className={`text-[10.5px] font-medium text-center whitespace-nowrap ${
              i === indice ? 'text-blue-950' : i < indice ? 'text-blue-600' : 'text-gray-300'
            }`}>
              {etapa.label}
            </span>
          </div>
          {i < ETAPAS.length - 1 && (
            <div className={`h-0.5 flex-1 mx-1 -mt-4 ${i < indice ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}