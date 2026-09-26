'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import GaleriaVeiculo from '../../components/GaleriaVeiculo'

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
      .select('*, veiculo_fotos(id, url, ordem)')
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
      cor: '', cambio: 'Automático', combustivel: 'Flex', categoria: 'Hatch', km: '', preco: '', preco_negociacao: '', fotos: []
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
      fotos: (veiculo.veiculo_fotos || []).sort((a, b) => a.ordem - b.ordem).map(f => ({ url: f.url }))
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
      ? await supabase.from('veiculos').update(dados).eq('id', editandoId).select()
      : await supabase.from('veiculos').insert([{ ...dados, concessionaria_id: concessionaria.id, status: 'ativo' }]).select()

    if (resultado.error) {
      setSalvando(false)
      setErroForm(resultado.error.message)
      return
    }

    const veiculoId = resultado.data[0].id

    // Save photos
    if (form.fotos && form.fotos.length > 0) {
      // Delete existing photos if editing to sync new state
      if (editandoId) {
        await supabase.from('veiculo_fotos').delete().eq('veiculo_id', veiculoId)
      }
      
      const fotosParaInserir = form.fotos.map((f, i) => ({
        veiculo_id: veiculoId,
        url: f.url,
        ordem: i
      }))
      
      await supabase.from('veiculo_fotos').insert(fotosParaInserir)
    } else if (editandoId) {
       // If no photos and editing, clear all photos
       await supabase.from('veiculo_fotos').delete().eq('veiculo_id', veiculoId)
    }

    setSalvando(false)

    setForm({
      marca: '', modelo: '', versao: '', ano_fabricacao: '', ano_modelo: '',
      cor: '', cambio: 'Automático', combustivel: 'Flex', categoria: 'Hatch', km: '', preco: '', preco_negociacao: '', fotos: []
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

  const [uploadingFoto, setUploadingFoto] = useState(false)
  
  async function handleUploadFoto(e) {
    if (!e.target.files || e.target.files.length === 0) return
    if (form.fotos.length >= 4) {
      setErroForm('Máximo de 4 fotos atingido.')
      return
    }

    setUploadingFoto(true)
    setErroForm('')

    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload-foto', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erro no upload')

      setForm({
        ...form,
        fotos: [...form.fotos, { url: data.url }]
      })
    } catch (err) {
      setErroForm(err.message)
    } finally {
      setUploadingFoto(false)
      // clear input
      e.target.value = ''
    }
  }

  function removerFoto(index) {
    setForm({
      ...form,
      fotos: form.fotos.filter((_, i) => i !== index)
    })
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 h-[61px]" />
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
          <div className="animate-pulse flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded-lg w-64" />
            <div className="h-10 bg-gray-200 rounded-lg w-32" />
          </div>
          <div className="animate-pulse grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 shadow-sm" />
            ))}
          </div>
          <div className="animate-pulse h-[300px] bg-white rounded-2xl border border-gray-100 shadow-sm" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-lg text-blue-950 hover:text-blue-700 transition">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              CarWise
            </a>
            <span className="text-[11px] font-mono font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">Concessionária</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">{concessionaria?.nome_fantasia}</span>
            <a href="/concessionaria/config" className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition">Configurações</a>
            <button
              onClick={handleLogout}
              className="text-sm font-semibold text-gray-500 hover:text-red-600 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">

        <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
          <div>
            <p className="text-xs font-mono text-amber-600 uppercase tracking-widest mb-2">Painel da concessionária</p>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-blue-950 mb-1">Seu estoque no CarWise</h1>
            <p className="text-gray-400 text-sm">{veiculos.length} veículo{veiculos.length !== 1 ? 's' : ''} cadastrado{veiculos.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/concessionaria/importar"
              className="bg-white text-blue-600 text-sm font-semibold px-5 py-2.5 rounded-lg border border-blue-200 hover:bg-blue-50 hover:-translate-y-0.5 transition shadow-sm flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Importar estoque
            </a>
            <button
              onClick={() => mostrarForm ? setMostrarForm(false) : abrirNovo()}
              className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 hover:-translate-y-0.5 transition shadow-sm"
            >
              {mostrarForm ? 'Cancelar' : '+ Cadastrar veículo'}
            </button>
          </div>
        </div>

        {erro && <p className="text-red-600 text-sm mb-5 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>}

        {mostrarForm && (
          <form onSubmit={salvarVeiculo} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6 space-y-4">
            <h3 className="font-[family-name:var(--font-display)] font-semibold text-blue-950 text-lg">{editandoId ? 'Editar veículo' : 'Novo veículo'}</h3>

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
              <Selecao label="Câmbio" value={form.cambio} onChange={v => set('cambio', v)} opcoes={['Automático', 'Manual', 'CVT', 'Automatizado']} />
              <Selecao label="Combustível" value={form.combustivel} onChange={v => set('combustivel', v)} opcoes={['Flex', 'Gasolina', 'Etanol', 'Diesel', 'Elétrico', 'Híbrido']} />
              <Selecao label="Categoria" value={form.categoria} onChange={v => set('categoria', v)} opcoes={['Hatch', 'Sedan', 'SUV', 'Picape', 'Minivan', 'Esportivo', 'Luxo']} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Campo label="Preço anunciado" required value={form.preco} onChange={v => set('preco', v)} placeholder="118900" />
              <Campo label="Preço mínimo de negociação (privado)" value={form.preco_negociacao} onChange={v => set('preco_negociacao', v)} placeholder="112000" />
            </div>
            <p className="text-xs text-gray-400 -mt-2 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#9CA3AF" strokeWidth="1.6"/><path d="M12 8v5M12 16h.01" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round"/></svg>
              O preço de negociação é confidencial — só consultores e o admin conseguem ver esse valor.
            </p>

            {erroForm && <p className="text-red-600 text-xs">{erroForm}</p>}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Fotos do veículo (Máx 4)</label>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {form.fotos.map((f, i) => (
                  <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 group bg-gray-50 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={`Foto ${i+1}`} className="object-cover w-full h-full" />
                    <button type="button" onClick={() => removerFoto(i)} className="absolute top-1 right-1 bg-white/90 text-red-500 rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-white transition opacity-0 group-hover:opacity-100">
                      ×
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 rounded">
                      {i === 0 ? 'Capa' : `Foto ${i+1}`}
                    </div>
                  </div>
                ))}
                
                {form.fotos.length < 4 && (
                  <label className={`relative aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${uploadingFoto ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'}`}>
                    <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleUploadFoto} disabled={uploadingFoto} />
                    {uploadingFoto ? (
                      <span className="text-xs text-blue-500 font-medium animate-pulse">Enviando...</span>
                    ) : (
                      <>
                        <span className="text-xl text-gray-400 mb-1">+</span>
                        <span className="text-xs text-gray-500 font-medium">Adicionar foto</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>

            <button type="submit" disabled={salvando || uploadingFoto} className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
              {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Adicionar ao estoque'}
            </button>
          </form>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {veiculos.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition flex flex-col md:flex-row gap-4">
              {v.veiculo_fotos && v.veiculo_fotos.length > 0 && (
                <div className="w-full md:w-1/3 aspect-video md:aspect-square shrink-0">
                  <GaleriaVeiculo fotos={v.veiculo_fotos} />
                </div>
              )}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-[family-name:var(--font-display)] font-semibold text-blue-950 text-lg">{v.marca} {v.modelo} {v.versao}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{v.ano_fabricacao}/{v.ano_modelo} · {v.km ? `${v.km} km` : '—'} · {v.cor}</p>
                  </div>
                  <span className={`text-xs font-mono px-2.5 py-1 rounded-full shrink-0 ${v.status === 'ativo' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {v.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <span className="bg-gray-50 px-2 py-1 rounded-md">{v.categoria || 'Sem categoria'}</span>
                  <span className="bg-gray-50 px-2 py-1 rounded-md">{v.cambio}</span>
                  <span className="bg-gray-50 px-2 py-1 rounded-md">{v.combustivel}</span>
                </div>
                <div className="font-[family-name:var(--font-display)] text-xl font-bold text-blue-950 mb-4">
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
            </div>
          ))}
          {veiculos.length === 0 && !mostrarForm && (
            <div className="col-span-2 text-center text-gray-400 text-sm py-14 bg-white rounded-2xl border border-gray-100">
              Nenhum veículo cadastrado ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Campo({ label, required, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none transition"
      />
    </div>
  )
}

function Selecao({ label, value, onChange, opcoes }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white focus:border-blue-400 focus:outline-none transition"
      >
        {opcoes.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}