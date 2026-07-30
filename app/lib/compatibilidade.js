// Calcula a compatibilidade entre o perfil de um cliente e um veículo do estoque.
// Retorna um número de 0 a 100, motivos positivos e pontos de atenção.
//
// As prioridades do cliente (sliders de 1-10 definidos no cadastro) ajustam o
// PESO de critérios que já temos dado real — não inventam dado que não existe.

export function calcularCompatibilidade(cliente, veiculo) {
  const preferencias = cliente.preferencias || {}
  const prioridades = cliente.prioridades || {}

  function fatorPrioridade(valor) {
    const v = Number(valor)
    if (!v || isNaN(v)) return 1
    return 1 + ((v - 5) / 5) * 0.2
  }

  let pontos = 0
  let pontosMaximos = 0
  const motivos = []
  const atencao = []

  // ===== ORÇAMENTO (peso base 26, ajustado por "economia") =====
  const peso_orcamento = 26 * fatorPrioridade(prioridades.economia)
  pontosMaximos += peso_orcamento

  const precoVeiculo = Number(veiculo.preco)
  const orcamentoMax = Number(preferencias.preco_max)
  const orcamentoMin = Number(preferencias.preco_min) || 0

  if (precoVeiculo && orcamentoMax) {
    if (precoVeiculo <= orcamentoMax && precoVeiculo >= orcamentoMin) {
      pontos += peso_orcamento
      motivos.push('Dentro do orçamento informado')
    } else if (precoVeiculo > orcamentoMax) {
      const excedente = (precoVeiculo - orcamentoMax) / orcamentoMax
      if (excedente <= 0.1) {
        pontos += peso_orcamento * 0.6
        atencao.push(`Preço ${(excedente * 100).toFixed(0)}% acima do orçamento máximo`)
      } else {
        atencao.push('Preço bem acima do orçamento informado')
      }
    } else {
      pontos += peso_orcamento * 0.8
    }
  } else {
    pontos += peso_orcamento * 0.5
  }

  // ===== CATEGORIA (peso 18) =====
  const peso_categoria = 18
  pontosMaximos += peso_categoria

  if (preferencias.categoria) {
    if (veiculo.categoria === preferencias.categoria) {
      pontos += peso_categoria
      motivos.push(`Categoria ${preferencias.categoria} conforme desejado`)
    } else if (!veiculo.categoria) {
      pontos += peso_categoria * 0.5
    } else {
      atencao.push(`Categoria ${veiculo.categoria}, diferente da desejada (${preferencias.categoria})`)
    }
  } else {
    pontos += peso_categoria * 0.5
  }

  // ===== ANO (peso 15) =====
  const peso_ano = 15
  pontosMaximos += peso_ano

  const anoVeiculo = veiculo.ano_modelo || veiculo.ano_fabricacao
  if (anoVeiculo && (preferencias.ano_min || preferencias.ano_max)) {
    const anoMin = Number(preferencias.ano_min) || 0
    const anoMax = Number(preferencias.ano_max) || 9999
    if (anoVeiculo >= anoMin && anoVeiculo <= anoMax) {
      pontos += peso_ano
      motivos.push(`Ano ${anoVeiculo} dentro da faixa desejada`)
    } else if (anoVeiculo > anoMax) {
      pontos += peso_ano
      motivos.push(`Ano ${anoVeiculo}, mais novo que o mínimo pedido`)
    } else {
      atencao.push(`Ano ${anoVeiculo} abaixo do mínimo desejado (${anoMin})`)
    }
  } else {
    pontos += peso_ano * 0.5
  }

  // ===== QUILOMETRAGEM (peso base 15, ajustado por "baixa manutenção") =====
  const peso_km = 15 * fatorPrioridade(prioridades.baixa_manutencao)
  pontosMaximos += peso_km

  if (veiculo.km && preferencias.km_maxima) {
    if (Number(veiculo.km) <= Number(preferencias.km_maxima)) {
      pontos += peso_km
      motivos.push('Quilometragem dentro do limite desejado')
    } else {
      const excedente = (Number(veiculo.km) - Number(preferencias.km_maxima)) / Number(preferencias.km_maxima)
      if (excedente <= 0.15) {
        pontos += peso_km * 0.5
        atencao.push('Quilometragem um pouco acima do limite')
      } else {
        atencao.push('Quilometragem bem acima do limite desejado')
      }
    }
  } else {
    pontos += peso_km * 0.5
  }

  // ===== CÂMBIO (peso base 16, ajustado por "conforto") =====
  const peso_cambio = 16 * fatorPrioridade(prioridades.conforto)
  pontosMaximos += peso_cambio

  if (preferencias.cambio && veiculo.cambio) {
    if (preferencias.cambio === veiculo.cambio) {
      pontos += peso_cambio
      motivos.push(`Câmbio ${veiculo.cambio} conforme preferido`)
    } else {
      atencao.push(`Câmbio ${veiculo.cambio}, cliente prefere ${preferencias.cambio}`)
    }
  } else {
    pontos += peso_cambio * 0.5
  }

  // ===== MARCA (peso 8) =====
  const peso_marca = 8
  pontosMaximos += peso_marca

  const marcasPreferidas = parseListaMarcas(preferencias.marcas_preferidas)
  const marcasRecusadas = parseListaMarcas(preferencias.marcas_recusadas)
  const marcaVeiculo = (veiculo.marca || '').toLowerCase().trim()

  if (marcasRecusadas.includes(marcaVeiculo)) {
    atencao.push(`Marca ${veiculo.marca} está na lista de marcas não aceitas pelo cliente`)
  } else if (marcasPreferidas.length > 0) {
    if (marcasPreferidas.includes(marcaVeiculo)) {
      pontos += peso_marca
      motivos.push(`Marca ${veiculo.marca} está entre as preferidas`)
    } else {
      pontos += peso_marca * 0.4
    }
  } else {
    pontos += peso_marca * 0.7
  }

  // ===== COR (peso 6) =====
  const peso_cor = 6
  pontosMaximos += peso_cor

  const corDesejada = (preferencias.cor || '').toLowerCase().trim()
  const corVeiculo = (veiculo.cor || '').toLowerCase().trim()

  if (!corDesejada || corDesejada.includes('sem prefer')) {
    pontos += peso_cor * 0.8
  } else if (corVeiculo && corDesejada === corVeiculo) {
    pontos += peso_cor
    motivos.push(`Cor ${veiculo.cor} conforme desejado`)
  } else if (corVeiculo) {
    pontos += peso_cor * 0.5
  } else {
    pontos += peso_cor * 0.6
  }

  const percentual = pontosMaximos > 0 ? Math.round((pontos / pontosMaximos) * 100) : 0

  return {
    percentual: Math.max(0, Math.min(100, percentual)),
    motivos,
    atencao,
  }
}

function parseListaMarcas(texto) {
  if (!texto) return []
  return texto
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean)
}