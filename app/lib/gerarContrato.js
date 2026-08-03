export function gerarTextoContrato({ nomeCliente, cpfCliente, plano, valor }) {
  const dataAtual = new Date().toLocaleDateString('pt-BR')

  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA AUTOMOTIVA

Pelo presente instrumento, de um lado CARWISE CONSULTORIA AUTOMOTIVA, doravante denominada CONTRATADA, e de outro lado ${nomeCliente}, portador(a) do CPF ${cpfCliente}, doravante denominado(a) CONTRATANTE, têm entre si justo e acordado o seguinte:

1. OBJETO
A CONTRATADA prestará ao CONTRATANTE serviços de consultoria para aquisição de veículo automotor, conforme as características do plano ${plano}, contratado nesta data.

2. PLANO CONTRATADO: ${plano}
Valor: R$ ${valor}

${plano === 'Básico' ? `
Serviços inclusos:
- Pesquisa de mercado
- Indicação de veículos compatíveis com o perfil do CONTRATANTE
- Análise documental do veículo escolhido
` : ''}
${plano === 'Premium' ? `
Serviços inclusos:
- Pesquisa completa de mercado
- Negociação conduzida pela CONTRATADA junto à concessionária
- Vistoria e avaliação mecânica do veículo
- Acompanhamento presencial durante o processo
` : ''}
${plano === 'Concierge' ? `
Serviços inclusos:
- Todos os serviços do plano Premium
- Test drive agendado e conduzido pela CONTRATADA
- Transferência e documentação completa do veículo
- Suporte pós-venda
` : ''}

3. OBRIGAÇÕES DA CONTRATADA
A CONTRATADA se compromete a atuar com transparência, diligência e boa-fé na condução do processo de compra, informando ao CONTRATANTE sobre cada etapa da negociação.

4. OBRIGAÇÕES DO CONTRATANTE
O CONTRATANTE se compromete a fornecer informações verdadeiras e atualizadas, necessárias à execução dos serviços contratados.

5. PAGAMENTO
O valor do plano contratado deverá ser pago conforme condições combinadas diretamente com o consultor responsável.

6. VIGÊNCIA
Este contrato vigora a partir da data de aceite até a conclusão do processo de compra do veículo ou por até 90 (noventa) dias, o que ocorrer primeiro.

7. DISPOSIÇÕES GERAIS
Este contrato é celebrado eletronicamente e o aceite digital do CONTRATANTE, registrado com data e hora, tem validade entre as partes.

Joinville, ${dataAtual}.`
}