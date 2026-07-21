'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

const PRIORIDADES_LABELS = [
  ['economia', 'Economia'],
  ['conforto', 'Conforto'],
  ['tecnologia', 'Tecnologia'],
  ['espaco', 'Espaço'],
  ['potencia', 'Potência'],
  ['seguranca', 'Segurança'],
  ['baixa_manutencao', 'Baixa manutenção'],
  ['revenda_facil', 'Revenda fácil'],
  ['design', 'Design'],
  ['status', 'Status'],
]

// Campos obrigatórios por seção, com rótulo amigável para a mensagem de erro
const CAMPOS_OBRIGATORIOS = {
  pessoal: [
    ['nome', 'Nome completo'],
    ['cpf', 'CPF'],
    ['email', 'E-mail'],
    ['senha', 'Senha'],
    ['cidade', 'Cidade'],
    ['estado', 'UF'],
  ],
  financeiro: [
    ['valor_disponivel', 'Valor disponível para o carro'],
    ['forma_pagamento', 'Forma de pagamento'],
  ],
  uso: [
    ['uso_principal', 'Uso principal do veículo'],
  ],
  preferencias: [
    ['categoria', 'Categoria do veículo'],
  ],
}

export default function Cadastro() {
  const router = useRouter()
  const [passo, setPasso] = useState(1)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const [pessoal, setPessoal] = useState({
    nome: '', cpf: '', email: '', senha: '', telefone: '',
    cidade: '', estado: '', estado_civil: '', profissao: '', data_nascimento: '',
  })

  const [financeiro, setFinanceiro] = useState({
    renda_mensal: '', renda_familiar: '', valor_disponivel: '', entrada: '',
    parcela_maxima: '', prazo_meses: '', forma_pagamento: 'Financiamento',
    tem_veiculo_troca: false, valor_veiculo_troca: '', tem_restricao: false, banco_preferencia: '',
  })

  const [uso, setUso] = useState({
    uso_principal: 'Família', pessoas_no_carro: '1', percurso_diario: 'Até 20 km', frequencia_viagens: 'Nunca',
  })

  const [preferencias, setPreferencias] = useState({
    categoria: 'Hatch', preco_min: '', preco_max: '', ano_min: '', ano_max: '',
    km_maxima: '', potencia_min: '', combustivel: 'Flex', cambio: 'Automático', cor: '',
    marcas_preferidas: '', marcas_recusadas: '',
  })

  const [prioridades, setPrioridades] = useState({
    economia: 5, conforto: 5, tecnologia: 5, espaco: 5, potencia: 5,
    seguranca: 5, baixa_manutencao: 5, revenda_facil: 5, design: 5, status: 5,
  })

  const totalPassos = 5

  function irPara(n) { setErro(''); setPasso(n) }

  // Verifica todos os campos obrigatórios de todas as seções.
  // Retorna a lista de rótulos faltando, e o número do primeiro passo com problema.
  function validarTudo() {
    const dadosPorSecao = { pessoal, financeiro, uso, preferencias }
    const passoPorSecao = { pessoal: 1, financeiro: 2, uso: 3, preferencias: 4 }

    const faltando = []
    let primeiroPassoComErro = null

    for (const secao of Object.keys(CAMPOS_OBRIGATORIOS)) {
      for (const [campo, rotulo] of CAMPOS_OBRIGATORIOS[secao]) {
        const valor = dadosPorSecao[secao][campo]
        if (!valor || String(valor).trim() === '') {
          faltando.push(rotulo)
          if (primeiroPassoComErro === null) {
            primeiroPassoComErro = passoPorSecao[secao]
          }
        }
      }
    }

    return { faltando, primeiroPassoComErro }
  }

  async function finalizar(e) {
    e.preventDefault()
    setErro('')

    const { faltando, primeiroPassoComErro } = validarTudo()

    if (faltando.length > 0) {
      setErro(`Preencha os campos obrigatórios antes de concluir: ${faltando.join(', ')}.`)
      setPasso(primeiroPassoComErro)
      return
    }

    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: pessoal.email,
      password: pessoal.senha,
    })

    if (authError) {
      setErro(authError.message)
      setLoading(false)
      return
    }

    const authId = authData.user?.id

    const { data: clienteData, error: clienteError } = await supabase
      .from('clientes')
      .insert([{
        auth_id: authId,
        nome: pessoal.nome,
        cpf: pessoal.cpf,
        email: pessoal.email,
        telefone: pessoal.telefone,
        cidade: pessoal.cidade,
        estado: pessoal.estado,
        estado_civil: pessoal.estado_civil,
        profissao: pessoal.profissao,
        data_nascimento: pessoal.data_nascimento || null,
      }])
      .select()
      .single()

    if (clienteError) {
      setErro('Erro ao salvar perfil: ' + clienteError.message)
      setLoading(false)
      return
    }

    const clienteId = clienteData.id

    const [rFin, rUso, rPref, rPrio] = await Promise.all([
      supabase.from('clientes_financeiro').insert([{
        cliente_id: clienteId,
        renda_mensal: financeiro.renda_mensal || null,
        renda_familiar: financeiro.renda_familiar || null,
        valor_disponivel: financeiro.valor_disponivel || null,
        entrada: financeiro.entrada || null,
        parcela_maxima: financeiro.parcela_maxima || null,
        prazo_meses: financeiro.prazo_meses || null,
        forma_pagamento: financeiro.forma_pagamento,
        tem_veiculo_troca: financeiro.tem_veiculo_troca,
        valor_veiculo_troca: financeiro.valor_veiculo_troca || null,
        tem_restricao: financeiro.tem_restricao,
        banco_preferencia: financeiro.banco_preferencia,
      }]),
      supabase.from('clientes_uso').insert([{
        cliente_id: clienteId,
        uso_principal: uso.uso_principal,
        pessoas_no_carro: uso.pessoas_no_carro,
        percurso_diario: uso.percurso_diario,
        frequencia_viagens: uso.frequencia_viagens,
      }]),
      supabase.from('clientes_preferencias').insert([{
        cliente_id: clienteId,
        categoria: preferencias.categoria,
        preco_min: preferencias.preco_min || null,
        preco_max: preferencias.preco_max || null,
        ano_min: preferencias.ano_min || null,
        ano_max: preferencias.ano_max || null,
        km_maxima: preferencias.km_maxima || null,
        potencia_min: preferencias.potencia_min,
        combustivel: preferencias.combustivel,
        cambio: preferencias.cambio,
        cor: preferencias.cor,
        marcas_preferidas: preferencias.marcas_preferidas,
        marcas_recusadas: preferencias.marcas_recusadas,
      }]),
      supabase.from('clientes_prioridades').insert([{
        cliente_id: clienteId,
        ...prioridades,
      }]),
    ])

    setLoading(false)

    const algumErro = [rFin, rUso, rPref, rPrio].find(r => r.error)
    if (algumErro) {
      setErro('Perfil criado, mas houve um erro ao salvar parte dos dados: ' + algumErro.error.message)
      return
    }

    router.push('/painel')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-6">
      <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-xl">
        <a href="/" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 mb-6 font-medium">
          ← Voltar
        </a>

        <h1 className="text-2xl font-bold text-blue-900 mb-1">Vamos montar seu perfil</h1>
        <p className="text-gray-500 text-sm mb-2">Quanto mais detalhes, mais preciso o consultor e a IA conseguem ser.</p>
        <p className="text-gray-400 text-xs mb-6">Campos com <span className="text-red-500">*</span> são obrigatórios.</p>

        {/* Navegação entre passos — livre, sem travar */}
        <div className="flex items-center gap-1.5 mb-8">
          {Array.from({ length: totalPassos }).map((_, i) => (
            <button
              type="button"
              key={i}
              onClick={() => irPara(i + 1)}
              className={`h-1.5 flex-1 rounded-full transition ${i + 1 === passo ? 'bg-blue-600' : i + 1 < passo ? 'bg-blue-300' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        <form onSubmit={finalizar}>
          {passo === 1 && (
            <PassoDados pessoal={pessoal} setPessoal={setPessoal} onNext={() => irPara(2)} />
          )}
          {passo === 2 && (
            <PassoFinanceiro financeiro={financeiro} setFinanceiro={setFinanceiro} onNext={() => irPara(3)} onBack={() => irPara(1)} />
          )}
          {passo === 3 && (
            <PassoUso uso={uso} setUso={setUso} onNext={() => irPara(4)} onBack={() => irPara(2)} />
          )}
          {passo === 4 && (
            <PassoPreferencias preferencias={preferencias} setPreferencias={setPreferencias} onNext={() => irPara(5)} onBack={() => irPara(3)} />
          )}
          {passo === 5 && (
            <PassoPrioridades prioridades={prioridades} setPrioridades={setPrioridades} onBack={() => irPara(4)} loading={loading} />
          )}

          {erro && (
            <p className="text-red-600 text-sm mt-4 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>
          )}
        </form>
      </div>
    </div>
  )
}

function Label({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function Input({ label, required, ...props }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      <input {...props} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400" />
    </div>
  )
}

function Select({ label, required, children, ...props }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      <select {...props} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 bg-white">
        {children}
      </select>
    </div>
  )
}

function NavBotoes({ onNext, onBack, isLast, loading }) {
  return (
    <div className="flex gap-3 mt-2">
      {onBack && (
        <button type="button" onClick={onBack} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-3 font-semibold text-sm hover:bg-gray-50">
          Voltar
        </button>
      )}
      {isLast ? (
        <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-semibold text-sm hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Salvando...' : 'Concluir cadastro'}
        </button>
      ) : (
        <button type="button" onClick={onNext} className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-semibold text-sm hover:bg-blue-700">
          Continuar
        </button>
      )}
    </div>
  )
}

function PassoDados({ pessoal, setPessoal, onNext }) {
  function set(campo, valor) { setPessoal({ ...pessoal, [campo]: valor }) }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-blue-950 mb-1">Dados pessoais</h3>
      <Input label="Nome completo" required value={pessoal.nome} onChange={e => set('nome', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="CPF" required value={pessoal.cpf} onChange={e => set('cpf', e.target.value)} />
        <Input label="Data de nascimento" type="date" value={pessoal.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="E-mail" type="email" required value={pessoal.email} onChange={e => set('email', e.target.value)} />
        <Input label="Telefone / WhatsApp" value={pessoal.telefone} onChange={e => set('telefone', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Estado civil" value={pessoal.estado_civil} onChange={e => set('estado_civil', e.target.value)}>
          <option value="">Selecione</option>
          <option>Solteiro(a)</option>
          <option>Casado(a)</option>
          <option>Divorciado(a)</option>
          <option>Viúvo(a)</option>
          <option>União estável</option>
        </Select>
        <Input label="Profissão" value={pessoal.profissao} onChange={e => set('profissao', e.target.value)} />
      </div>
      <div className="grid grid-cols-[1fr_80px] gap-3">
        <Input label="Cidade" required value={pessoal.cidade} onChange={e => set('cidade', e.target.value)} />
        <Input label="UF" required maxLength={2} value={pessoal.estado} onChange={e => set('estado', e.target.value)} />
      </div>
      <Input label="Crie uma senha" type="password" required minLength={6} value={pessoal.senha} onChange={e => set('senha', e.target.value)} />

      <NavBotoes onNext={onNext} />
    </div>
  )
}

function PassoFinanceiro({ financeiro, setFinanceiro, onNext, onBack }) {
  function set(campo, valor) { setFinanceiro({ ...financeiro, [campo]: valor }) }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-blue-950 mb-1">Dados financeiros</h3>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Renda mensal" value={financeiro.renda_mensal} onChange={e => set('renda_mensal', e.target.value)} placeholder="6500" />
        <Input label="Renda familiar" value={financeiro.renda_familiar} onChange={e => set('renda_familiar', e.target.value)} placeholder="9000" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Valor disponível para o carro" required value={financeiro.valor_disponivel} onChange={e => set('valor_disponivel', e.target.value)} placeholder="90000" />
        <Input label="Valor de entrada" value={financeiro.entrada} onChange={e => set('entrada', e.target.value)} placeholder="20000" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Parcela máxima" value={financeiro.parcela_maxima} onChange={e => set('parcela_maxima', e.target.value)} placeholder="1800" />
        <Select label="Prazo máximo" value={financeiro.prazo_meses} onChange={e => set('prazo_meses', e.target.value)}>
          <option value="">Selecione</option>
          <option value="24">24 meses</option>
          <option value="36">36 meses</option>
          <option value="48">48 meses</option>
          <option value="60">60 meses</option>
        </Select>
      </div>
      <Select label="Como pretende pagar?" required value={financeiro.forma_pagamento} onChange={e => set('forma_pagamento', e.target.value)}>
        <option>Financiamento</option>
        <option>À vista</option>
        <option>Consórcio</option>
        <option>Ainda não sei</option>
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={financeiro.tem_veiculo_troca} onChange={e => set('tem_veiculo_troca', e.target.checked)} />
          Tenho veículo para troca
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={financeiro.tem_restricao} onChange={e => set('tem_restricao', e.target.checked)} />
          Possuo restrição no nome
        </label>
      </div>
      {financeiro.tem_veiculo_troca && (
        <Input label="Valor estimado do veículo" value={financeiro.valor_veiculo_troca} onChange={e => set('valor_veiculo_troca', e.target.value)} placeholder="35000" />
      )}
      <Input label="Banco de preferência (opcional)" value={financeiro.banco_preferencia} onChange={e => set('banco_preferencia', e.target.value)} placeholder="Ex: Santander, BV, Itaú" />

      <NavBotoes onNext={onNext} onBack={onBack} />
    </div>
  )
}

function PassoUso({ uso, setUso, onNext, onBack }) {
  function set(campo, valor) { setUso({ ...uso, [campo]: valor }) }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-blue-950 mb-1">Perfil de uso</h3>
      <Select label="Uso principal do veículo" required value={uso.uso_principal} onChange={e => set('uso_principal', e.target.value)}>
        {['Família', 'Trabalho', 'Aplicativo', 'Viagens', 'Cidade', 'Estrada', 'Lazer', 'Comercial'].map(v => <option key={v}>{v}</option>)}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Quantas pessoas usam o carro?" value={uso.pessoas_no_carro} onChange={e => set('pessoas_no_carro', e.target.value)}>
          {['1', '2', '3', '4', '5+'].map(v => <option key={v}>{v}</option>)}
        </Select>
        <Select label="Percurso médio diário" value={uso.percurso_diario} onChange={e => set('percurso_diario', e.target.value)}>
          {['Até 20 km', '20–50 km', '50–100 km', 'Acima de 100 km'].map(v => <option key={v}>{v}</option>)}
        </Select>
      </div>
      <Select label="Frequência de viagens" value={uso.frequencia_viagens} onChange={e => set('frequencia_viagens', e.target.value)}>
        {['Nunca', 'Mensal', 'Quinzenal', 'Semanal'].map(v => <option key={v}>{v}</option>)}
      </Select>

      <NavBotoes onNext={onNext} onBack={onBack} />
    </div>
  )
}

function PassoPreferencias({ preferencias, setPreferencias, onNext, onBack }) {
  function set(campo, valor) { setPreferencias({ ...preferencias, [campo]: valor }) }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-blue-950 mb-1">Preferências do veículo</h3>
      <Select label="Categoria" required value={preferencias.categoria} onChange={e => set('categoria', e.target.value)}>
        {['Hatch', 'Sedan', 'SUV', 'Picape', 'Minivan', 'Esportivo', 'Luxo'].map(v => <option key={v}>{v}</option>)}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Preço mínimo" value={preferencias.preco_min} onChange={e => set('preco_min', e.target.value)} placeholder="60000" />
        <Input label="Preço máximo" value={preferencias.preco_max} onChange={e => set('preco_max', e.target.value)} placeholder="90000" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Ano mínimo" value={preferencias.ano_min} onChange={e => set('ano_min', e.target.value)} placeholder="2019" />
        <Input label="Ano máximo" value={preferencias.ano_max} onChange={e => set('ano_max', e.target.value)} placeholder="2024" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Quilometragem máxima" value={preferencias.km_maxima} onChange={e => set('km_maxima', e.target.value)} placeholder="80000" />
        <Input label="Potência mínima (opcional)" value={preferencias.potencia_min} onChange={e => set('potencia_min', e.target.value)} placeholder="120 cv" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Combustível" value={preferencias.combustivel} onChange={e => set('combustivel', e.target.value)}>
          {['Flex', 'Gasolina', 'Etanol', 'Diesel', 'Elétrico', 'Híbrido'].map(v => <option key={v}>{v}</option>)}
        </Select>
        <Select label="Transmissão" value={preferencias.cambio} onChange={e => set('cambio', e.target.value)}>
          {['Automático', 'Manual', 'CVT', 'Automatizado'].map(v => <option key={v}>{v}</option>)}
        </Select>
      </div>
      <Input label="Cor desejada (opcional)" value={preferencias.cor} onChange={e => set('cor', e.target.value)} placeholder="Sem preferência" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Marcas preferidas (opcional)" value={preferencias.marcas_preferidas} onChange={e => set('marcas_preferidas', e.target.value)} placeholder="Ex: Honda, Toyota" />
        <Input label="Marcas que não aceita (opcional)" value={preferencias.marcas_recusadas} onChange={e => set('marcas_recusadas', e.target.value)} placeholder="Ex: nenhuma" />
      </div>

      <NavBotoes onNext={onNext} onBack={onBack} />
    </div>
  )
}

function PassoPrioridades({ prioridades, setPrioridades, onBack, loading }) {
  function set(campo, valor) { setPrioridades({ ...prioridades, [campo]: Number(valor) }) }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-blue-950 mb-1">O que é mais importante pra você?</h3>
        <p className="text-xs text-gray-500">Isso ajuda a IA a entender suas prioridades — quem valoriza muito economia dificilmente será recomendado um esportivo de alto consumo.</p>
      </div>

      <div className="space-y-3.5">
        {PRIORIDADES_LABELS.map(([campo, label]) => (
          <div key={campo} className="grid grid-cols-[110px_1fr_24px] items-center gap-3">
            <label className="text-sm text-gray-700 font-medium">{label}</label>
            <input
              type="range" min="1" max="10"
              value={prioridades[campo]}
              onChange={e => set(campo, e.target.value)}
              className="w-full accent-blue-600"
            />
            <span className="text-sm font-mono text-blue-700 text-right">{prioridades[campo]}</span>
          </div>
        ))}
      </div>

      <NavBotoes onBack={onBack} isLast loading={loading} />
    </div>
  )
}