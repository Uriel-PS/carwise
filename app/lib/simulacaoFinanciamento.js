// Simulação simplificada de financiamento — NÃO é uma análise de crédito real.
// Serve apenas como referência educativa para o cliente entender sua capacidade
// de pagamento, usando a regra de bolso comum de que a parcela não deveria
// ultrapassar 30% da renda mensal.

export function simularFinanciamento({ precoVeiculo, renda, entrada, prazoMeses }) {
  const preco = Number(precoVeiculo) || 0
  const rendaMensal = Number(renda) || 0
  const valorEntrada = Number(entrada) || 0
  const prazo = Number(prazoMeses) || 48 // padrão 48 meses se não informado

  if (!preco || !rendaMensal) {
    return null // dados insuficientes para simular
  }

  const valorFinanciado = Math.max(preco - valorEntrada, 0)
  const parcelaEstimada = valorFinanciado / prazo
  const comprometimentoRenda = (parcelaEstimada / rendaMensal) * 100

  let status = 'confortavel'
  let mensagem = 'A parcela estimada cabe bem no seu orçamento.'

  if (comprometimentoRenda > 30) {
    status = 'alerta'
    mensagem = 'A parcela estimada pode comprometer uma parte grande da sua renda mensal.'
  } else if (comprometimentoRenda > 20) {
    status = 'atencao'
    mensagem = 'A parcela estimada é razoável, mas vale considerar uma entrada maior ou prazo mais longo.'
  }

  return {
    valorFinanciado,
    parcelaEstimada,
    comprometimentoRenda: Math.round(comprometimentoRenda * 10) / 10,
    status, // 'confortavel' | 'atencao' | 'alerta'
    mensagem,
  }
}