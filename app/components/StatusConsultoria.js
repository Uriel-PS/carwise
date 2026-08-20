// Mapping from consultant's granular pipeline stages to client-facing stages
const PIPELINE_MAP = {
  novos: 'cadastro',
  entrevista: 'cadastro',
  perfil_definido: 'cadastro',
  cadastro: 'cadastro',
  buscando: 'buscando',
  veiculos_selecionados: 'buscando',
  negociando: 'negociando',
  vistoria: 'negociando',
  test_drive: 'negociando',
  proposta: 'negociando',
  documentacao: 'documentacao',
  compra_concluida: 'entrega',
  pos_venda: 'entrega',
  entrega: 'entrega',
}

const ETAPAS = [
  { chave: 'cadastro', label: 'Cadastro' },
  { chave: 'buscando', label: 'Buscando veículos' },
  { chave: 'negociando', label: 'Em negociação' },
  { chave: 'documentacao', label: 'Documentação' },
  { chave: 'entrega', label: 'Entrega' },
]

export default function StatusConsultoria({ etapaAtual }) {
  // Map the pipeline stage to a client-facing stage
  const etapaMapeada = PIPELINE_MAP[etapaAtual] || PIPELINE_MAP['novos']
  const indiceAtual = ETAPAS.findIndex((e) => e.chave === etapaMapeada)
  const indice = indiceAtual === -1 ? 0 : indiceAtual

  return (
    <div className="w-full flex justify-between items-start relative px-1 sm:px-2">
      {ETAPAS.map((etapa, i) => (
        <div key={etapa.chave} className="relative flex flex-col items-center z-10 flex-1">
          {i < ETAPAS.length - 1 && (
            <div 
              className={`absolute top-[5px] left-1/2 w-full h-0.5 -z-10 ${i < indice ? 'bg-blue-600' : 'bg-gray-200'}`} 
            />
          )}
          
          <div className={`w-3 h-3 rounded-full shrink-0 ${
            i < indice ? 'bg-blue-600' :
            i === indice ? 'bg-blue-600 ring-4 ring-blue-100' :
            'bg-gray-200'
          }`} />
          
          <span className={`mt-2 text-[9px] sm:text-[10.5px] text-center leading-[1.2] px-0.5 sm:px-1 w-full max-w-[70px] sm:max-w-none ${
            i === indice ? 'text-blue-950 font-bold' : i < indice ? 'text-blue-600 font-medium' : 'text-gray-400 font-medium'
          }`}>
            {etapa.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// Export the mapping for use in other components
export { PIPELINE_MAP }