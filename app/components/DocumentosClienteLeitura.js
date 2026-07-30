'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function DocumentosClienteLeitura({ clienteId }) {
  const [documentos, setDocumentos] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from('documentos_clientes')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })

      if (!error) setDocumentos(data || [])
      setCarregando(false)
    }
    carregar()
  }, [clienteId])

  async function baixarDocumento(doc) {
    const { data, error } = await supabase.storage
      .from('documentos-clientes')
      .createSignedUrl(doc.caminho_storage, 60)

    if (error) {
      alert('Não foi possível gerar o link de download.')
      return
    }

    window.open(data.signedUrl, '_blank')
  }

  if (carregando) return null

  if (documentos.length === 0) {
    return <p className="text-gray-400 text-sm">Nenhum documento enviado por este cliente ainda.</p>
  }

  return (
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
          <button onClick={() => baixarDocumento(doc)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0 ml-3">
            Baixar
          </button>
        </div>
      ))}
    </div>
  )
}