'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function DocumentosCliente({ clienteId, authId }) {
  const [documentos, setDocumentos] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarDocumentos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId])

  async function carregarDocumentos() {
    const { data, error } = await supabase
      .from('documentos_clientes')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    if (!error) setDocumentos(data || [])
    setCarregando(false)
  }

  async function handleUpload(e) {
    const arquivo = e.target.files[0]
    if (!arquivo) return
console.log('authId recebido:', authId, typeof authId)

    setErro('')
    setEnviando(true)

    // Limite simples de tamanho: 10MB
    if (arquivo.size > 10 * 1024 * 1024) {
      setErro('O arquivo é muito grande. Limite de 10MB.')
      setEnviando(false)
      return
    }

    const nomeUnico = `${Date.now()}_${arquivo.name}`
    const caminho = `${authId}/${nomeUnico}`

    const { error: uploadError } = await supabase.storage
      .from('documentos-clientes')
      .upload(caminho, arquivo)

    if (uploadError) {
      setErro('Erro ao enviar arquivo: ' + uploadError.message)
      setEnviando(false)
      return
    }

    const { error: dbError } = await supabase
      .from('documentos_clientes')
      .insert([{
        cliente_id: clienteId,
        nome_arquivo: arquivo.name,
        caminho_storage: caminho,
        tipo_documento: 'Geral',
      }])

    setEnviando(false)

    if (dbError) {
      setErro('Arquivo enviado, mas houve erro ao registrar: ' + dbError.message)
      return
    }

    e.target.value = ''
    carregarDocumentos()
  }

  async function baixarDocumento(doc) {
    const { data, error } = await supabase.storage
      .from('documentos-clientes')
      .createSignedUrl(doc.caminho_storage, 60) // link válido por 60 segundos

    if (error) {
      alert('Não foi possível gerar o link de download.')
      return
    }

    window.open(data.signedUrl, '_blank')
  }

  async function removerDocumento(doc) {
    if (!confirm(`Remover o documento "${doc.nome_arquivo}"?`)) return

    await supabase.storage.from('documentos-clientes').remove([doc.caminho_storage])
    await supabase.from('documentos_clientes').delete().eq('id', doc.id)

    carregarDocumentos()
  }

  if (carregando) return null

  return (
    <div>
      <label className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-blue-700 transition cursor-pointer mb-4">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 4v12m0-12l-4 4m4-4l4 4M4 20h16" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {enviando ? 'Enviando...' : 'Enviar documento'}
        <input type="file" onChange={handleUpload} disabled={enviando} className="hidden" />
      </label>

      {erro && <p className="text-red-600 text-xs mb-4">{erro}</p>}

      {documentos.length === 0 ? (
        <p className="text-gray-400 text-sm">Nenhum documento enviado ainda.</p>
      ) : (
        <div className="space-y-2">
          {documentos.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#2B5FE0" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 2v6h6" stroke="#2B5FE0" strokeWidth="1.6" strokeLinejoin="round"/></svg>
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">{doc.nome_arquivo}</p>
                  <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex gap-3 shrink-0 ml-3">
                <button onClick={() => baixarDocumento(doc)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                  Baixar
                </button>
                <button onClick={() => removerDocumento(doc)} className="text-xs font-semibold text-red-500 hover:text-red-700">
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}