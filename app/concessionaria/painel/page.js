'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function PainelConcessionaria() {
  const router = useRouter()
  const [concessionaria, setConcessionaria] = useState(null)
  const [veiculos, setVeiculos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [mostrarForm, setMostrarForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState({
    marca: '', modelo: '', versao: '', ano_fabricacao: '', ano_modelo: '',
    cor: '', cambio: 'Automático', combustivel: 'Flex', categoria: 'Hatch', km: '', preco: '', preco_negociacao: '',
  })

  async function carregarTudo() {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) { router.push('/concessionaria/login'); return }

    const user = sessionData.session.user

    const { data: concessionariaData } = await supabase
      .from('concessionarias')
      .select('*')
      .eq('auth_id', user.id)
      .eq('ativo', true)
      .maybeSingle()

    if (!concessionariaData) { router.push('/concessionaria/login'); return }

    setConcessionaria(concessionariaData)

    const { data: veiculosData, error: veiculosError } = await supabase
      .from('veiculos')
      .select('*')
      .eq('concessionaria_id', concessionariaData.id)
      .order('created_at', { ascending: false })

    if (veiculosError) setErro(veiculosError.message)
    setVeiculos(veiculosData || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarTudo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/concessionaria/login')
  }

  function set(campo, valor) { setForm({ ...form, [campo]: valor }) }

  function abrirNovo() {
    setEditandoId(null)
    setForm({
      marca: '', modelo: '', versao: '', ano_fabricacao: '', ano_modelo: '',
      cor: '', cambio: 'Automático', combustivel: 'Flex', categoria: 'Hatch', km: '', preco: '', preco_negociacao: '',
    })
    setErroForm('')
    setMostrarForm(true)
  }

  function abrirEdicao(veiculo) {
    setEditandoId(veiculo.id)
    setForm({
      marca: veiculo.marca || '', modelo: veiculo.modelo || '', versao: veiculo.versao || '',
      ano_fabricacao: veiculo.ano_fabricacao || '', ano_modelo: veiculo.ano_modelo || '',
      cor: veiculo.cor || '', cambio: veiculo.cambio || 'Automático', combustivel: veiculo.combustivel || 'Flex',
      categoria: veiculo.categoria || 'Hatch',
      km: veiculo.km || '', preco: veiculo.preco || '', preco_negociacao: veiculo.preco_negociacao || '',
    })
    setErroForm('')
    setMostrarForm(true)
  }

  async function salvarVeiculo(e) {
    e.preventDefault()
    setSalvando(true)
    setErroForm('')

    const dados = {
      marca: form.marca,
      modelo: form.modelo,
      versao: form.versao,
      ano_fabricacao: form.ano_fabricacao || null,
      ano_modelo: form.ano_modelo || null,
      cor: form.cor,
      cambio: form.cambio,
      combustivel: form.combustivel,
      categoria: form.categoria,
      km: form.km || null,
      preco: form.preco || null,
      preco_negociacao: form.preco_negociacao || null,
    }

    const resultado = editandoId
      ? await supabase.from('veiculos').update(dados).eq('id', editandoId)
      : await supabase.from('veiculos').insert([{ ...dados, concessionaria_id: concessionaria.id, status: 'ativo' }])

    setSalvando(false)

    if (resultado.error) {
      setErroForm(resultado.error.message)
      return
    }

    setForm({
      marca: '', modelo: '', versao: '', ano_fabricacao: '', ano_modelo: '',
      cor: '', cambio: 'Automático', combustivel: 'Flex', km: '', preco: '', preco_negociacao: '',
    })
    setEditandoId(null)
    setMostrarForm(false)
    carregarTudo()
  }

  async function removerVeiculo(id) {
    if (!confirm('Remover este veículo do estoque?')) return
    await supabase.from('veiculos').delete().eq('id', id)
    carregarTudo()
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <div className="font-bold text-blue-950">CarWise <span className="text-xs font-mono font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full ml-1">Concessionária</span></div>
            <div className="text-xs text-gray-400">{concessionaria?.nome_fantasia}</div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-red-100 transition"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-950 mb-1">Seu estoque no CarWise</h1>
            <p className="text-gray-500 text-sm">{veiculos.length} veículo{veiculos.length !== 1 ? 's' : ''} cadastrado{veiculos.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => mostrarForm ? setMostrarForm(false) : abrirNovo()}
            className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition"
          >
            {mostrarForm ? 'Cancelar' : '+ Cadastrar veículo'}
          </button>
        </div>

        {erro && <p className="text-red-600 text-sm mb-5 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>}

        {mostrarForm && (
          <form onSubmit={salvarVeiculo} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6 space-y-4">
            <h3 className="font-semibold text-blue-950">{editandoId ? 'Editar veículo' : 'Novo veículo'}</h3>

            <div className="grid grid-cols-3 gap-3">
              <Campo label="Marca" required value={form.marca} onChange={v => set('marca', v)} placeholder="Honda" />
              <Campo label="Modelo" required value={form.modelo} onChange={v => set('modelo', v)} placeholder="HR-V" />
              <Campo label="Versão" value={form.versao} onChange={v => set('versao', v)} placeholder="EXL" />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <Campo label="Ano fabricação" value={form.ano_fabricacao} onChange={v => set('ano_fabricacao', v)} placeholder="2022" />
              <Campo label="Ano modelo" value={form.ano_modelo} onChange={v => set('ano_modelo', v)} placeholder="2023" />
              <Campo label="Cor" value={form.cor} onChange={v => set('cor', v)} placeholder="Prata" />
              <Campo label="Quilometragem" value={form.km} onChange={v => set('km', v)} placeholder="32000" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Câmbio</label>
                <select value={form.cambio} onChange={e => set('cambio', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white">
                  <option>Automático</option><option>Manual</option><option>CVT</option><option>Automatizado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Combustível</label>
                <select value={form.combustivel} onChange={e => set('combustivel', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white">
                  <option>Flex</option><option>Gasolina</option><option>Etanol</option><option>Diesel</option><option>Elétrico</option><option>Híbrido</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Categoria</label>
                <select value={form.categoria} onChange={e => set('categoria', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white">
                  <option>Hatch</option><option>Sedan</option><option>SUV</option><option>Picape</option><option>Minivan</option><option>Esportivo</option><option>Luxo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Campo label="Preço anunciado" required value={form.preco} onChange={v => set('preco', v)} placeholder="118900" />
              <Campo label="Preço mínimo de negociação (privado)" value={form.preco_negociacao} onChange={v => set('preco_negociacao', v)} placeholder="112000" />
            </div>
            <p className="text-xs text-gray-400 -mt-2">O preço de negociação é confidencial — só consultores e o admin conseguem ver esse valor.</p>

            {erroForm && <p className="text-red-600 text-xs">{erroForm}</p>}

            <button type="submit" disabled={salvando} className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
              {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Adicionar ao estoque'}
            </button>
          </form>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {veiculos.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-blue-950">{v.marca} {v.modelo} {v.versao}</h4>
                  <p className="text-xs text-gray-400">{v.ano_fabricacao}/{v.ano_modelo} · {v.km ? `${v.km} km` : '—'} · {v.cor}</p>
                </div>
                <span className={`text-xs font-mono px-2.5 py-1 rounded-full ${v.status === 'ativo' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {v.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-1">{v.cambio} · {v.combustivel}</div>
              <div className="text-lg font-bold text-blue-950 mb-3">
                {v.preco ? Number(v.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—'}
              </div>
              <div className="flex gap-4">
                <button onClick={() => abrirEdicao(v)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                  Editar
                </button>
                <button onClick={() => removerVeiculo(v.id)} className="text-xs font-semibold text-red-500 hover:text-red-700">
                  Remover
                </button>
              </div>
            </div>
          ))}
          {veiculos.length === 0 && !mostrarForm && (
            <div className="col-span-2 text-center text-gray-400 py-10">Nenhum veículo cadastrado ainda.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Campo({ label, required, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400"
      />
    </div>
  )
}