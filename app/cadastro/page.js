'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

const PRIORIDADES_LABELS = [
  ['economia', 'Economia'], ['conforto', 'Conforto'], ['tecnologia', 'Tecnologia'],
  ['espaco', 'Espaço'], ['potencia', 'Potência'], ['seguranca', 'Segurança'],
  ['baixa_manutencao', 'Baixa manutenção'], ['revenda_facil', 'Revenda fácil'],
  ['design', 'Design'], ['status', 'Status'],
]

const CAMPOS_OBRIGATORIOS = {
  pessoal: [
    ['nome', 'Nome completo'], ['cpf', 'CPF'], ['data_nascimento', 'Data de nascimento'],
    ['email', 'E-mail'], ['telefone', 'Telefone / WhatsApp'], ['senha', 'Senha'],
    ['cidade', 'Cidade'], ['estado', 'UF'],
  ],
  financeiro: [
    ['renda_mensal', 'Média de renda mensal'], ['valor_disponivel', 'Valor disponível para o carro'], ['forma_pagamento', 'Forma de pagamento'],
  ],
  uso: [['uso_principal', 'Uso principal do veículo']],
  preferencias: [['categoria', 'Categoria do veículo']],
}

const PASSOS = [
  { titulo: 'Dados', icon: <IconDados /> },
  { titulo: 'Financeiro', icon: <IconFinanceiro /> },
  { titulo: 'Uso', icon: <IconUso /> },
  { titulo: 'Veículo', icon: <IconVeiculo /> },
  { titulo: 'Prioridades', icon: <IconPrioridade /> },
]

export default function Cadastro() {
  const router = useRouter()
  const [passo, setPasso] = useState(1)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const [pessoal, setPessoal] = useState({
    nome: '', cpf: '', email: '', senha: '', telefone: '',
    cidade: '', estado: '', estado_civil: '', profissao: '', empresa: '', data_nascimento: '',
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
    categoria: 'Hatch', preco_min: '', preco_max: '', ano_min: '', ano_max: '', km_maxima: '',
    potencia_min: '', combustivel: 'Flex', cambio: 'Automático', cor: '', marcas_preferidas: '', marcas_recusadas: '',
  })
  const [prioridades, setPrioridades] = useState({
    economia: 5, conforto: 5, tecnologia: 5, espaco: 5, potencia: 5,
    seguranca: 5, baixa_manutencao: 5, revenda_facil: 5, design: 5, status: 5,
  })

  function irPara(n) { setErro(''); setPasso(n) }

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
          if (primeiroPassoComErro === null) primeiroPassoComErro = passoPorSecao[secao]
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
        nome: pessoal.nome, cpf: pessoal.cpf, email: pessoal.email, telefone: pessoal.telefone,
        cidade: pessoal.cidade, estado: pessoal.estado, estado_civil: pessoal.estado_civil,
        profissao: pessoal.profissao, empresa: pessoal.empresa,
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
      supabase.from('clientes_financeiro').insert([{ cliente_id: clienteId, ...financeiro }]),
      supabase.from('clientes_uso').insert([{ cliente_id: clienteId, ...uso }]),
      supabase.from('clientes_preferencias').insert([{ cliente_id: clienteId, ...preferencias }]),
      supabase.from('clientes_prioridades').insert([{ cliente_id: clienteId, ...prioridades }]),
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="bg-white p-10 rounded-2xl shadow-[0_30px_60px_-24px_rgba(10,34,71,0.18)] border border-gray-100 w-full max-w-xl">
        <a href="/" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 transition mb-6 font-medium">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7H3M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Voltar
        </a>

        <h1 className="font-[family-name:var(--font-display)] font-bold text-[28px] text-blue-950 mb-1.5 leading-tight">Vamos montar seu perfil</h1>
        <p className="text-gray-400 text-sm mb-1.5">Quanto mais detalhes, mais preciso o consultor e a IA conseguem ser.</p>
        <p className="text-gray-300 text-xs mb-6">Campos com <span className="text-red-400">*</span> são obrigatórios.</p>

        {/* Indicador de passos com ícones */}
        <div className="flex items-center gap-1 mb-8">
          {PASSOS.map((p, i) => (
            <div key={p.titulo} className="flex-1 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => irPara(i + 1)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                  i + 1 === passo ? 'bg-blue-600 text-white shadow-[0_0_0_5px_rgba(43,95,224,0.12)]'
                  : i + 1 < passo ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-300'
                }`}
              >
                {p.icon}
              </button>
              <span className={`text-[10.5px] font-medium ${i + 1 === passo ? 'text-blue-950' : 'text-gray-300'}`}>{p.titulo}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 mb-8 -mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition ${i + 1 <= passo ? 'bg-blue-600' : 'bg-gray-100'}`} />
          ))}
        </div>

        <form onSubmit={finalizar}>
          {passo === 1 && <PassoDados pessoal={pessoal} setPessoal={setPessoal} onNext={() => irPara(2)} />}
          {passo === 2 && <PassoFinanceiro financeiro={financeiro} setFinanceiro={setFinanceiro} onNext={() => irPara(3)} onBack={() => irPara(1)} />}
          {passo === 3 && <PassoUso uso={uso} setUso={setUso} onNext={() => irPara(4)} onBack={() => irPara(2)} />}
          {passo === 4 && <PassoPreferencias preferencias={preferencias} setPreferencias={setPreferencias} onNext={() => irPara(5)} onBack={() => irPara(3)} />}
          {passo === 5 && <PassoPrioridades prioridades={prioridades} setPrioridades={setPrioridades} onBack={() => irPara(4)} loading={loading} />}

          {erro && (
            <p className="text-red-600 text-sm mt-4 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>
          )}
        </form>
      </div>
    </div>
  )
}

function Label({ children, required }) {
  return <label className="block text-xs font-semibold text-gray-600 mb-1.5">{children}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
}
function Input({ label, required, ...props }) {
  return <div><Label required={required}>{label}</Label><input {...props} className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none transition" /></div>
}
function Select({ label, required, children, ...props }) {
  return <div><Label required={required}>{label}</Label><select {...props} className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 bg-white focus:border-blue-400 focus:outline-none transition">{children}</select></div>
}
function NavBotoes({ onNext, onBack, isLast, loading }) {
  return (
    <div className="flex gap-3 mt-2">
      {onBack && <button type="button" onClick={onBack} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-3 font-semibold text-sm hover:bg-gray-50 transition">Voltar</button>}
      {isLast
        ? <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-semibold text-sm hover:bg-blue-700 hover:-translate-y-0.5 transition disabled:opacity-50 disabled:translate-y-0 shadow-sm">{loading ? 'Salvando...' : 'Concluir cadastro'}</button>
        : <button type="button" onClick={onNext} className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-semibold text-sm hover:bg-blue-700 hover:-translate-y-0.5 transition shadow-sm">Continuar</button>}
    </div>
  )
}

function PassoDados({ pessoal, setPessoal, onNext }) {
  function set(campo, valor) { setPessoal({ ...pessoal, [campo]: valor }) }
  return (
    <div className="space-y-4">
      <TituloPasso icon={<IconDados />}>Dados pessoais</TituloPasso>
      <Input label="Nome completo" required value={pessoal.nome} onChange={e => set('nome', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="CPF" required value={pessoal.cpf} onChange={e => set('cpf', e.target.value)} />
        <Input label="Data de nascimento" type="date" required value={pessoal.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="E-mail" type="email" required value={pessoal.email} onChange={e => set('email', e.target.value)} />
        <Input label="Telefone / WhatsApp" required value={pessoal.telefone} onChange={e => set('telefone', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Estado civil" value={pessoal.estado_civil} onChange={e => set('estado_civil', e.target.value)}>
          <option value="">Selecione</option>
          <option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option><option>Viúvo(a)</option><option>União estável</option>
        </Select>
        <Input label="Profissão" value={pessoal.profissao} onChange={e => set('profissao', e.target.value)} />
      </div>
      <Input label="Local de trabalho (opcional)" value={pessoal.empresa} onChange={e => set('empresa', e.target.value)} placeholder="Nome da empresa" />
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
      <TituloPasso icon={<IconFinanceiro />}>Dados financeiros</TituloPasso>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Média de renda mensal" required value={financeiro.renda_mensal} onChange={e => set('renda_mensal', e.target.value)} placeholder="6500" />
        <Input label="Renda familiar" value={financeiro.renda_familiar} onChange={e => set('renda_familiar', e.target.value)} placeholder="9000" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Valor disponível" required value={financeiro.valor_disponivel} onChange={e => set('valor_disponivel', e.target.value)} placeholder="90000" />
        <Input label="Valor de entrada" value={financeiro.entrada} onChange={e => set('entrada', e.target.value)} placeholder="20000" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Parcela máxima" value={financeiro.parcela_maxima} onChange={e => set('parcela_maxima', e.target.value)} placeholder="1800" />
        <Select label="Prazo máximo" value={financeiro.prazo_meses} onChange={e => set('prazo_meses', e.target.value)}>
          <option value="">Selecione</option><option value="24">24 meses</option><option value="36">36 meses</option><option value="48">48 meses</option><option value="60">60 meses</option>
        </Select>
      </div>
      <Select label="Como pretende pagar?" required value={financeiro.forma_pagamento} onChange={e => set('forma_pagamento', e.target.value)}>
        <option>Financiamento</option><option>À vista</option><option>Consórcio</option><option>Ainda não sei</option>
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={financeiro.tem_veiculo_troca} onChange={e => set('tem_veiculo_troca', e.target.checked)} className="accent-blue-600" />Tenho veículo para troca
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={financeiro.tem_restricao} onChange={e => set('tem_restricao', e.target.checked)} className="accent-blue-600" />Possuo restrição no nome
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
      <TituloPasso icon={<IconUso />}>Perfil de uso</TituloPasso>
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
      <TituloPasso icon={<IconVeiculo />}>Preferências do veículo</TituloPasso>
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
      <TituloPasso icon={<IconPrioridade />}>O que é mais importante pra você?</TituloPasso>
      <p className="text-xs text-gray-400 -mt-1 mb-1">Isso ajuda a IA a entender suas prioridades reais — quem valoriza muito economia dificilmente será recomendado um esportivo de alto consumo.</p>
      <div className="space-y-3.5">
        {PRIORIDADES_LABELS.map(([campo, label]) => (
          <div key={campo} className="grid grid-cols-[110px_1fr_24px] items-center gap-3">
            <label className="text-sm text-gray-700 font-medium">{label}</label>
            <input type="range" min="1" max="10" value={prioridades[campo]} onChange={e => set(campo, e.target.value)} className="w-full accent-blue-600" />
            <span className="text-sm font-mono text-blue-700 text-right">{prioridades[campo]}</span>
          </div>
        ))}
      </div>
      <NavBotoes onBack={onBack} isLast loading={loading} />
    </div>
  )
}

function TituloPasso({ icon, children }) {
  return (
    <div className="flex items-center gap-2.5 mb-1">
      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">{icon}</div>
      <h3 className="font-[family-name:var(--font-display)] font-semibold text-blue-950 text-lg">{children}</h3>
    </div>
  )
}

function IconDados() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12z" stroke="currentColor" strokeWidth="1.6"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> }
function IconFinanceiro() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg> }
function IconUso() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> }
function IconVeiculo() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 16l1.4-4.5A2 2 0 017.3 10h9.4a2 2 0 011.9 1.5L20 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="16" width="18" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></svg> }
function IconPrioridade() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.9 6.3 6.8.6-5.1 4.6 1.5 6.7L12 16.9l-6.1 3.3 1.5-6.7-5.1-4.6 6.8-.6L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg> }