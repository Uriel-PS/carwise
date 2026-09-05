'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const COLUNAS_OBRIGATORIAS = ['marca', 'modelo', 'preco']
const COLUNAS_ESPERADAS = [
  'marca', 'modelo', 'versao', 'ano_fabricacao', 'ano_modelo',
  'cor', 'cambio', 'combustivel', 'categoria', 'km',
  'preco', 'preco_negociacao', 'foto_1', 'foto_2', 'foto_3', 'foto_4'
]
const CAMBIOS_VALIDOS = ['Automático', 'Manual', 'CVT', 'Automatizado']
const COMBUSTIVEIS_VALIDOS = ['Flex', 'Gasolina', 'Etanol', 'Diesel', 'Elétrico', 'Híbrido']
const CATEGORIAS_VALIDAS = ['Hatch', 'Sedan', 'SUV', 'Picape', 'Minivan', 'Esportivo', 'Luxo']

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  // Handle quoted CSV fields
  function parseLine(line) {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (c === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += c
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
  const rows = lines.slice(1).map(line => {
    const values = parseLine(line)
    const obj = {}
    headers.forEach((h, i) => {
      obj[h] = values[i] || ''
    })
    return obj
  })

  return { headers, rows }
}

function validarLinha(row, index) {
  const erros = []
  const linha = index + 2

  if (!row.marca?.trim()) erros.push('Marca obrigatória')
  if (!row.modelo?.trim()) erros.push('Modelo obrigatório')
  if (!row.preco && row.preco !== '0') erros.push('Preço obrigatório')

  if (row.preco) {
    const p = Number(row.preco)
    if (isNaN(p) || p <= 0) erros.push('Preço inválido')
  }
  if (row.preco_negociacao) {
    const pn = Number(row.preco_negociacao)
    if (isNaN(pn) || pn <= 0) erros.push('Preço negociação inválido')
  }
  if (row.km) {
    const km = Number(row.km)
    if (isNaN(km) || km < 0) erros.push('KM inválido')
  }
  if (row.ano_fabricacao) {
    const af = Number(row.ano_fabricacao)
    if (isNaN(af) || af < 1900 || af > 2030) erros.push('Ano fab. inválido')
  }
  if (row.ano_modelo) {
    const am = Number(row.ano_modelo)
    if (isNaN(am) || am < 1900 || am > 2030) erros.push('Ano mod. inválido')
  }
  if (row.cambio && !CAMBIOS_VALIDOS.includes(row.cambio)) erros.push('Câmbio inválido')
  if (row.combustivel && !COMBUSTIVEIS_VALIDOS.includes(row.combustivel)) erros.push('Combustível inválido')
  if (row.categoria && !CATEGORIAS_VALIDAS.includes(row.categoria)) erros.push('Categoria inválida')

  ;['foto_1', 'foto_2', 'foto_3', 'foto_4'].forEach(key => {
    if (row[key]?.trim()) {
      try { new URL(row[key].trim()) } catch { erros.push(`${key} URL inválida`) }
    }
  })

  return erros
}

export default function ImportarVeiculos() {
  const router = useRouter()
  const [concessionaria, setConcessionaria] = useState(null)
  const [carregando, setCarregando] = useState(true)

  // Import states
  const [etapa, setEtapa] = useState('upload') // upload | preview | importing | result
  const [arquivo, setArquivo] = useState(null)
  const [dados, setDados] = useState([])
  const [headers, setHeaders] = useState([])
  const [errosValidacao, setErrosValidacao] = useState({}) // { rowIndex: [erros] }
  const [colunasAusentes, setColunasAusentes] = useState([])
  const [dragging, setDragging] = useState(false)
  const [erroArquivo, setErroArquivo] = useState('')

  // Import progress
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erroImportacao, setErroImportacao] = useState('')

  useEffect(() => {
    async function verificarAuth() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) { router.push('/concessionaria/login'); return }

      const { data: concData } = await supabase
        .from('concessionarias')
        .select('*')
        .eq('auth_id', sessionData.session.user.id)
        .eq('ativo', true)
        .maybeSingle()

      if (!concData) { router.push('/concessionaria/login'); return }
      setConcessionaria(concData)
      setCarregando(false)
    }
    verificarAuth()
  }, [router])

  const processarArquivo = useCallback(async (file) => {
    setErroArquivo('')
    setColunasAusentes([])

    const nome = file.name.toLowerCase()
    const isCSV = nome.endsWith('.csv')
    const isExcel = nome.endsWith('.xlsx') || nome.endsWith('.xls')

    if (!isCSV && !isExcel) {
      setErroArquivo('Formato não suportado. Use arquivos .csv ou .xlsx')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setErroArquivo('Arquivo muito grande. Máximo de 10MB.')
      return
    }

    setArquivo(file)

    let parsedHeaders = []
    let parsedRows = []

    if (isCSV) {
      const text = await file.text()
      const result = parseCSV(text)
      parsedHeaders = result.headers
      parsedRows = result.rows
    } else {
      // Excel parsing with SheetJS
      const XLSX = (await import('xlsx')).default
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })

      if (jsonData.length > 0) {
        parsedHeaders = Object.keys(jsonData[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'))
        parsedRows = jsonData.map(row => {
          const obj = {}
          Object.entries(row).forEach(([key, val]) => {
            obj[key.toLowerCase().replace(/\s+/g, '_')] = String(val)
          })
          return obj
        })
      }
    }

    if (parsedRows.length === 0) {
      setErroArquivo('O arquivo está vazio ou não contém dados válidos.')
      return
    }

    if (parsedRows.length > 500) {
      setErroArquivo(`O arquivo contém ${parsedRows.length} linhas. O máximo permitido é 500 veículos por importação.`)
      return
    }

    // Check for missing required columns
    const ausentes = COLUNAS_OBRIGATORIAS.filter(c => !parsedHeaders.includes(c))
    if (ausentes.length > 0) {
      setColunasAusentes(ausentes)
      setErroArquivo(`Colunas obrigatórias ausentes: ${ausentes.join(', ')}. Baixe o modelo para ver o formato correto.`)
      return
    }

    // Validate each row
    const erros = {}
    parsedRows.forEach((row, i) => {
      const rowErros = validarLinha(row, i)
      if (rowErros.length > 0) erros[i] = rowErros
    })

    setHeaders(parsedHeaders)
    setDados(parsedRows)
    setErrosValidacao(erros)
    setEtapa('preview')
  }, [])

  function handleFileInput(e) {
    if (e.target.files && e.target.files[0]) {
      processarArquivo(e.target.files[0])
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processarArquivo(e.dataTransfer.files[0])
    }
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setDragging(false)
  }

  async function handleImportar() {
    setImportando(true)
    setErroImportacao('')

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        setErroImportacao('Sessão expirada. Faça login novamente.')
        setImportando(false)
        return
      }

      const res = await fetch('/api/importar-veiculos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ veiculos: dados }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.erros && data.erros.length > 0) {
          setErroImportacao(data.erros.join('\n'))
        } else {
          setErroImportacao(data.error || 'Erro ao importar veículos.')
        }
        setImportando(false)
        return
      }

      setResultado(data)
      setEtapa('result')
    } catch (err) {
      setErroImportacao('Erro de conexão. Tente novamente.')
    } finally {
      setImportando(false)
    }
  }

  function resetar() {
    setEtapa('upload')
    setArquivo(null)
    setDados([])
    setHeaders([])
    setErrosValidacao({})
    setColunasAusentes([])
    setErroArquivo('')
    setResultado(null)
    setErroImportacao('')
  }

  const totalValidos = dados.length - Object.keys(errosValidacao).length
  const totalErros = Object.keys(errosValidacao).length
  const totalFotos = dados.reduce((acc, row) => {
    return acc + ['foto_1', 'foto_2', 'foto_3', 'foto_4'].filter(k => row[k]?.trim()).length
  }, 0)

  // Visible columns for preview (exclude foto columns for cleaner view)
  const colunasVisiveis = ['marca', 'modelo', 'versao', 'ano_fabricacao', 'ano_modelo', 'cor', 'cambio', 'combustivel', 'categoria', 'km', 'preco', 'preco_negociacao']
  const headersFiltrados = headers.filter(h => colunasVisiveis.includes(h))

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-lg text-blue-950 hover:text-blue-700 transition">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              CarWise
            </a>
            <span className="text-[11px] font-mono font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">Concessionária</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">{concessionaria?.nome_fantasia}</span>
            <a href="/concessionaria/painel" className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition">Voltar ao painel</a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Breadcrumb + Title */}
        <div className="mb-8 flex items-center gap-2">
          <a href="/concessionaria/painel" className="text-gray-400 hover:text-blue-600 transition">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          <div>
            <p className="text-xs font-mono text-amber-600 uppercase tracking-widest mb-1">Importação em massa</p>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-blue-950">Importar estoque</h1>
            <p className="text-gray-400 text-sm mt-0.5">Cadastre múltiplos veículos de uma vez usando um arquivo CSV ou Excel.</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { key: 'upload', label: 'Upload', icon: '1' },
            { key: 'preview', label: 'Revisão', icon: '2' },
            { key: 'result', label: 'Resultado', icon: '3' },
          ].map((step, i) => {
            const isActive = step.key === etapa || (etapa === 'importing' && step.key === 'preview')
            const isPast = (etapa === 'preview' && step.key === 'upload') ||
              (etapa === 'importing' && step.key === 'upload') ||
              (etapa === 'result' && (step.key === 'upload' || step.key === 'preview'))

            return (
              <div key={step.key} className="flex items-center gap-2">
                {i > 0 && <div className={`w-8 h-px ${isPast || isActive ? 'bg-blue-400' : 'bg-gray-200'}`} />}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' :
                  isPast ? 'bg-blue-50 text-blue-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {isPast ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <span>{step.icon}</span>
                  )}
                  {step.label}
                </div>
              </div>
            )
          })}
        </div>

        {/* STEP 1: Upload */}
        {etapa === 'upload' && (
          <div className="space-y-6">
            {/* Download template card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-[family-name:var(--font-display)] font-semibold text-blue-950 text-base">Modelo de planilha</h3>
                <p className="text-sm text-gray-500 mt-0.5">Baixe o modelo CSV com as colunas corretas e 2 exemplos. Preencha seus veículos e faça o upload aqui.</p>
              </div>
              <a
                href="/modelo_importacao.csv"
                download
                className="bg-white text-blue-600 text-sm font-semibold px-5 py-2.5 rounded-xl border border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition shrink-0 shadow-sm"
              >
                ↓ Baixar modelo .csv
              </a>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative bg-white rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer group ${
                dragging
                  ? 'border-blue-400 bg-blue-50/50 scale-[1.01]'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
              }`}
              onClick={() => document.getElementById('file-input').click()}
            >
              <input
                id="file-input"
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
              />
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all ${
                dragging ? 'bg-blue-100 scale-110' : 'bg-gray-50 group-hover:bg-blue-50'
              }`}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className={`transition-colors ${dragging ? 'text-blue-500' : 'text-gray-300 group-hover:text-blue-400'}`}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="font-[family-name:var(--font-display)] font-semibold text-blue-950 text-lg mb-1">
                {dragging ? 'Solte o arquivo aqui' : 'Arraste seu arquivo aqui'}
              </p>
              <p className="text-sm text-gray-400">
                ou <span className="text-blue-600 font-medium">clique para selecionar</span>
              </p>
              <p className="text-xs text-gray-300 mt-3">Formatos aceitos: .csv, .xlsx · Máximo: 500 veículos</p>
            </div>

            {erroArquivo && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-500 text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="text-sm text-red-700 font-medium">Erro no arquivo</p>
                  <p className="text-sm text-red-600 mt-0.5">{erroArquivo}</p>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="font-[family-name:var(--font-display)] font-semibold text-blue-950 text-base mb-4">Como funciona</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: '📋', title: 'Baixe o modelo', desc: 'Use nosso template CSV como base. Ele já vem com as colunas certas.' },
                  { icon: '✏️', title: 'Preencha os dados', desc: 'Adicione seus veículos na planilha. Marca, modelo e preço são obrigatórios.' },
                  { icon: '🚀', title: 'Faça o upload', desc: 'Arraste o arquivo aqui. Vamos validar e importar tudo de uma vez.' },
                ].map(step => (
                  <div key={step.title} className="flex flex-col items-start gap-2 p-4 rounded-xl bg-gray-50/50">
                    <span className="text-2xl">{step.icon}</span>
                    <h4 className="text-sm font-semibold text-blue-950">{step.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>

              {/* Header row explanation */}
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="bg-blue-50 rounded-xl p-4 flex gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#3B82F6" strokeWidth="1.8"/><path d="M12 8v5M12 16h.01" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  </div>
                  <div className="text-xs text-blue-900 leading-relaxed">
                    <p className="font-semibold mb-1.5">Sobre a primeira linha (cabeçalho)</p>
                    <ul className="space-y-1 text-blue-800">
                      <li>• A <strong>primeira linha deve ser mantida</strong> — ela contém o nome das colunas e é usada pelo sistema para identificar cada campo.</li>
                      <li>• <strong>Não remova a primeira linha.</strong> Se ela for apagada, o sistema não saberá qual coluna é qual.</li>
                      <li>• Você pode <strong>mudar a ordem das colunas</strong> livremente. O sistema lê pelo <em>nome</em> da coluna, não pela posição.</li>
                      <li>• Também pode <strong>remover colunas opcionais</strong> que não quiser preencher. Só as obrigatórias (<code className="bg-blue-100 px-1 rounded">marca</code>, <code className="bg-blue-100 px-1 rounded">modelo</code>, <code className="bg-blue-100 px-1 rounded">preco</code>) precisam existir.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">Colunas aceitas</h4>
                <div className="flex flex-wrap gap-1.5">
                  {COLUNAS_ESPERADAS.map(c => (
                    <span key={c} className={`text-xs px-2.5 py-1 rounded-md font-mono ${
                      COLUNAS_OBRIGATORIAS.includes(c) 
                        ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100' 
                        : 'bg-gray-50 text-gray-500 border border-gray-100'
                    }`}>
                      {c}{COLUNAS_OBRIGATORIAS.includes(c) ? '*' : ''}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">* campos obrigatórios</p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Valores válidos</h4>
                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-gray-700">Câmbio:</span>
                    <span className="text-gray-500 ml-1">{CAMBIOS_VALIDOS.join(', ')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Combustível:</span>
                    <span className="text-gray-500 ml-1">{COMBUSTIVEIS_VALIDOS.join(', ')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Categoria:</span>
                    <span className="text-gray-500 ml-1">{CATEGORIAS_VALIDAS.join(', ')}</span>
                  </div>
                </div>
              </div>

              {/* Photo instructions */}
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="#7C3AED" strokeWidth="1.5"/>
                      <circle cx="8.5" cy="8.5" r="1.5" stroke="#7C3AED" strokeWidth="1.5"/>
                      <path d="M21 15l-5-5L5 21" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Como adicionar fotos dos veículos</h4>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 mb-4">
                  <div className="p-4 rounded-xl bg-violet-50/50 border border-violet-100/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🔗</span>
                      <h5 className="text-sm font-semibold text-violet-900">Via link na planilha</h5>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Coloque a <strong>URL pública</strong> da imagem nas colunas <code className="text-violet-700 bg-violet-100 px-1 rounded text-[10px]">foto_1</code> a <code className="text-violet-700 bg-violet-100 px-1 rounded text-[10px]">foto_4</code>. 
                      Cada veículo pode ter até 4 fotos. A <code className="text-violet-700 bg-violet-100 px-1 rounded text-[10px]">foto_1</code> será usada como foto de capa.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">☁️</span>
                      <h5 className="text-sm font-semibold text-blue-900">De onde pegar os links?</h5>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Hospede suas fotos em qualquer serviço público:<br/>
                      • <strong>Google Drive</strong> — compartilhe a foto como "Qualquer pessoa com o link" e use o link direto<br/>
                      • <strong>Imgur</strong> — faça upload gratuito e copie o link<br/>
                      • <strong>Site próprio</strong> — use a URL das fotos que já estão no seu site
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">✨</span>
                      <h5 className="text-sm font-semibold text-emerald-900">Adicionar depois</h5>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Não tem links agora? <strong>Sem problema.</strong> Importe os veículos sem fotos e depois adicione as imagens editando cada veículo no <a href="/concessionaria/painel" className="text-emerald-700 font-semibold underline underline-offset-2">painel</a>, 
                      fazendo upload diretamente pelo botão de editar.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">Exemplo de preenchimento das colunas de foto</h5>
                  <div className="overflow-x-auto">
                    <table className="text-[11px] font-mono">
                      <thead>
                        <tr className="text-gray-400">
                          <th className="text-left pr-4 pb-1 font-medium">foto_1</th>
                          <th className="text-left pr-4 pb-1 font-medium">foto_2</th>
                          <th className="text-left pr-4 pb-1 font-medium">foto_3</th>
                          <th className="text-left pb-1 font-medium">foto_4</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="text-violet-700">
                          <td className="pr-4 py-1">https://i.imgur.com/abc123.jpg</td>
                          <td className="pr-4 py-1">https://i.imgur.com/def456.jpg</td>
                          <td className="pr-4 py-1"></td>
                          <td className="py-1"></td>
                        </tr>
                        <tr className="text-blue-700">
                          <td className="pr-4 py-1">https://drive.google.com/file/d/1A.../view</td>
                          <td className="pr-4 py-1">https://drive.google.com/file/d/2B.../view</td>
                          <td className="pr-4 py-1"></td>
                          <td className="py-1"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#9CA3AF" strokeWidth="1.6"/><path d="M12 8v5M12 16h.01" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round"/></svg>
                    As URLs precisam ser públicas (acessíveis sem login). Links que exigem autenticação não funcionarão como foto do veículo.
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Formatos de imagem suportados: JPG, PNG, WEBP e GIF (máx: 5MB por foto).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Preview */}
        {(etapa === 'preview' || etapa === 'importing') && (
          <div className="space-y-6">
            {/* Summary bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Arquivo</p>
                  <p className="text-sm font-semibold text-blue-950">{arquivo?.name}</p>
                </div>
              </div>

              <div className="h-8 w-px bg-gray-100 hidden sm:block" />

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-950">{dados.length}</p>
                  <p className="text-[11px] text-gray-400 font-medium">total</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${totalValidos > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>{totalValidos}</p>
                  <p className="text-[11px] text-gray-400 font-medium">válidos</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${totalErros > 0 ? 'text-red-500' : 'text-gray-300'}`}>{totalErros}</p>
                  <p className="text-[11px] text-gray-400 font-medium">com erros</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${totalFotos > 0 ? 'text-violet-600' : 'text-gray-300'}`}>{totalFotos}</p>
                  <p className="text-[11px] text-gray-400 font-medium">fotos</p>
                </div>
              </div>

              <div className="ml-auto flex gap-3">
                <button
                  onClick={resetar}
                  disabled={importando}
                  className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportar}
                  disabled={importando || totalValidos === 0}
                  className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition shadow-sm shadow-blue-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {importando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      Importar {totalValidos} veículo{totalValidos !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>

            {totalErros > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-3 flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 9v4M12 17h.01" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">{totalErros} linha{totalErros !== 1 ? 's' : ''} com erro{totalErros !== 1 ? 's' : ''}</span> — serão ignorada{totalErros !== 1 ? 's' : ''} na importação. Apenas os {totalValidos} veículos válidos serão importados.
                </p>
              </div>
            )}

            {erroImportacao && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4">
                <p className="text-sm text-red-700 font-medium mb-1">Erro na importação</p>
                <p className="text-sm text-red-600 whitespace-pre-wrap">{erroImportacao}</p>
              </div>
            )}

            {/* Data table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">Status</th>
                      {headersFiltrados.map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          {h.replace(/_/g, ' ')}
                          {COLUNAS_OBRIGATORIAS.includes(h) && <span className="text-red-400 ml-0.5">*</span>}
                        </th>
                      ))}
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fotos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.map((row, i) => {
                      const temErro = errosValidacao[i]
                      const numFotos = ['foto_1', 'foto_2', 'foto_3', 'foto_4'].filter(k => row[k]?.trim()).length

                      return (
                        <tr key={i} className={`border-b border-gray-50 transition ${temErro ? 'bg-red-50/40' : 'hover:bg-gray-50/50'}`}>
                          <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{i + 2}</td>
                          <td className="px-4 py-2.5">
                            {temErro ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full" title={temErro.join(', ')}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                                Erro
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                OK
                              </span>
                            )}
                          </td>
                          {headersFiltrados.map(h => {
                            const valor = row[h] || ''
                            const isObrigatorio = COLUNAS_OBRIGATORIAS.includes(h)
                            const vazio = isObrigatorio && !valor.trim()

                            return (
                              <td key={h} className={`px-4 py-2.5 text-sm whitespace-nowrap ${
                                vazio ? 'text-red-500 font-medium' : 'text-gray-700'
                              }`}>
                                {valor || (isObrigatorio ? '—' : '')}
                              </td>
                            )
                          })}
                          <td className="px-4 py-2.5">
                            {numFotos > 0 ? (
                              <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                                {numFotos} foto{numFotos > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Error details */}
              {totalErros > 0 && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                  <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Detalhes dos erros</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {Object.entries(errosValidacao).map(([index, erros]) => (
                      <div key={index} className="text-xs text-red-600">
                        <span className="font-semibold">Linha {Number(index) + 2}:</span>{' '}
                        {erros.join(' · ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Result */}
        {etapa === 'result' && resultado && (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-50 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl text-blue-950 mb-2">
                Importação concluída!
              </h2>
              <p className="text-gray-500 text-sm mb-8">{resultado.mensagem}</p>

              <div className="flex justify-center gap-8 mb-8">
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-600">{resultado.total_importados}</p>
                  <p className="text-xs text-gray-400 mt-1 font-medium">veículos importados</p>
                </div>
                <div className="h-12 w-px bg-gray-100" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-violet-600">{resultado.total_fotos}</p>
                  <p className="text-xs text-gray-400 mt-1 font-medium">fotos importadas</p>
                </div>
                {resultado.total_fotos_falha > 0 && (
                  <>
                    <div className="h-12 w-px bg-gray-100" />
                    <div className="text-center">
                      <p className="text-3xl font-bold text-amber-500">{resultado.total_fotos_falha}</p>
                      <p className="text-xs text-gray-400 mt-1 font-medium">fotos com falha</p>
                    </div>
                  </>
                )}
              </div>

              {resultado.total_fotos_falha > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-6 text-left">
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">{resultado.total_fotos_falha} foto{resultado.total_fotos_falha !== 1 ? 's' : ''}</span> não 
                    {resultado.total_fotos_falha !== 1 ? ' puderam' : ' pôde'} ser baixada{resultado.total_fotos_falha !== 1 ? 's' : ''} do link informado. 
                    Verifique se os links são públicos e acessíveis. Você pode adicionar as fotos manualmente editando o veículo no painel.
                  </p>
                </div>
              )}

              <div className="flex justify-center gap-3">
                <button
                  onClick={resetar}
                  className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
                >
                  Nova importação
                </button>
                <a
                  href="/concessionaria/painel"
                  className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                  Ver meu estoque →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
