'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function LaudosConsultor({ clienteId }) {
  const [laudos, setLaudos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [nomeVeiculo, setNomeVeiculo] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  async function carregar() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('laudos')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    if (!error) {
      setLaudos(data || [])
    }
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [clienteId])

  async function handleEnviar(e) {
    e.preventDefault()
    if (!arquivo) {
      alert('Selecione um arquivo para enviar.')
      return
    }
    if (!nomeVeiculo.trim()) {
      alert('Informe o nome do veículo (ex: Honda Civic 2020).')
      return
    }

    setEnviando(true)

    // Caminho no storage: laudos/clienteId/timestamp_nomeArquivo
    const timestamp = Date.now()
    const extensao = arquivo.name.split('.').pop()
    const nomeLimpo = nomeVeiculo.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
    const nomeStorage = `${clienteId}/${timestamp}_${nomeLimpo}.${extensao}`

    const { error: uploadError } = await supabase.storage
      .from('laudos')
      .upload(nomeStorage, arquivo)

    if (uploadError) {
      alert('Erro ao enviar arquivo: ' + uploadError.message)
      setEnviando(false)
      return
    }

    const { error: dbError } = await supabase
      .from('laudos')
      .insert([{
        cliente_id: clienteId,
        nome_veiculo: nomeVeiculo.trim(),
        caminho_storage: nomeStorage
      }])

    setEnviando(false)

    if (dbError) {
      alert('Arquivo enviado, mas ocorreu um erro ao registrar no banco: ' + dbError.message)
    } else {
      setMostrarForm(false)
      setArquivo(null)
      setNomeVeiculo('')
      carregar()
    }
  }

  async function baixarLaudo(doc) {
    const { data, error } = await supabase.storage
      .from('laudos')
      .createSignedUrl(doc.caminho_storage, 60)

    if (error) {
      alert('Não foi possível gerar o link de download.')
      return
    }

    window.open(data.signedUrl, '_blank')
  }
  
  async function removerLaudo(doc) {
    if(!confirm('Tem certeza que deseja remover este laudo?')) return
    
    // Deleta do storage
    await supabase.storage
      .from('laudos')
      .remove([doc.caminho_storage])
      
    // Deleta do banco
    await supabase
      .from('laudos')
      .delete()
      .eq('id', doc.id)
      
    carregar()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-semibold text-blue-950 text-lg">Laudos e Vistorias</h2>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
        >
          {mostrarForm ? 'Cancelar' : '+ Novo Laudo'}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleEnviar} className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 mb-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Veículo avaliado</label>
            <input
              type="text"
              placeholder="Ex: Honda Civic 2020 LXR"
              required
              value={nomeVeiculo}
              onChange={(e) => setNomeVeiculo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Arquivo do laudo (PDF ou Imagem)</label>
            <input
              type="file"
              required
              accept=".pdf,image/*"
              onChange={(e) => setArquivo(e.target.files[0])}
              className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 mt-2"
          >
            {enviando ? 'Enviando...' : 'Salvar Laudo'}
          </button>
        </form>
      )}

      {carregando ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : laudos.length === 0 ? (
        <p className="text-gray-400 text-sm">Nenhum laudo enviado para este cliente.</p>
      ) : (
        <div className="space-y-2">
          {laudos.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M9 12h6M9 16h6M9 8h2" stroke="#2B5FE0" strokeWidth="1.5" strokeLinecap="round"/><rect x="5" y="3" width="14" height="18" rx="2" stroke="#2B5FE0" strokeWidth="1.5"/></svg>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-blue-950 truncate">{doc.nome_veiculo} - Laudo</p>
                  <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString('pt-BR')} às {new Date(doc.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => baixarLaudo(doc)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0">
                  Visualizar
                </button>
                <button onClick={() => removerLaudo(doc)} className="text-xs font-semibold text-red-400 hover:text-red-600 shrink-0">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
