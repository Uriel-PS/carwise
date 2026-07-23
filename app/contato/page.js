'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

const COPY_POR_ASSUNTO = {
  concessionaria: {
    titulo: 'Seja uma concessionária parceira',
    sub: 'Conte um pouco sobre sua concessionária. Depois de conversarmos e fecharmos a parceria, liberamos o acesso para você cadastrar seu estoque.',
  },
  oficina: {
    titulo: 'Credencie sua oficina',
    sub: 'Conte sobre sua oficina e capacidade de atendimento. Entraremos em contato para alinhar o processo de vistoria.',
  },
  seguradora: {
    titulo: 'Parcerias com seguradoras e bancos',
    sub: 'Conte sobre sua instituição e como podemos estruturar a parceria.',
  },
  trabalhe: {
    titulo: 'Trabalhe conosco',
    sub: 'Conte um pouco sobre você e a vaga ou área de interesse.',
  },
  outro: {
    titulo: 'Fale com a gente',
    sub: 'Preencha os dados abaixo — nossa equipe responde em até 2 dias úteis.',
  },
}

function FormularioContato() {
  const searchParams = useSearchParams()
  const assuntoInicial = searchParams.get('assunto') || 'outro'

  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    assunto: assuntoInicial,
    nome: '',
    empresa: '',
    email: '',
    telefone: '',
    mensagem: '',
  })

  useEffect(() => {
    setForm((f) => ({ ...f, assunto: assuntoInicial }))
  }, [assuntoInicial])

  function set(campo, valor) {
    setForm({ ...form, [campo]: valor })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const { error } = await supabase.from('mensagens_contato').insert([form])

    setLoading(false)

    if (error) {
      setErro('Não foi possível enviar sua mensagem: ' + error.message)
    } else {
      setEnviado(true)
    }
  }

  const copy = COPY_POR_ASSUNTO[form.assunto] || COPY_POR_ASSUNTO.outro

  if (enviado) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 12l5 5L20 6" stroke="#3F9E6D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h1 className="text-xl font-bold text-blue-950 mb-2">Mensagem enviada</h1>
        <p className="text-gray-500 text-sm mb-6">
          Obrigado pelo contato. Nossa equipe vai analisar e retornar em breve — se for uma parceria comercial, conversamos primeiro e o cadastro é liberado depois do acordo fechado.
        </p>
        <a href="/" className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition">
          Voltar para o site
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-10">
      <a href="/" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 mb-6 font-medium">
        ← Voltar
      </a>

      <h1 className="text-2xl font-bold text-blue-900 mb-2">{copy.titulo}</h1>
      <p className="text-gray-500 text-sm mb-6">{copy.sub}</p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Assunto</label>
          <select
            value={form.assunto}
            onChange={(e) => set('assunto', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 bg-white"
          >
            <option value="concessionaria">Quero ser concessionária parceira</option>
            <option value="oficina">Quero credenciar minha oficina</option>
            <option value="seguradora">Sou seguradora / banco</option>
            <option value="trabalhe">Trabalhe conosco</option>
            <option value="outro">Outro assunto</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text" placeholder="Nome" required
            value={form.nome} onChange={(e) => set('nome', e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400"
          />
          <input
            type="text" placeholder="Empresa (se houver)"
            value={form.empresa} onChange={(e) => set('empresa', e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="email" placeholder="E-mail" required
            value={form.email} onChange={(e) => set('email', e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400"
          />
          <input
            type="tel" placeholder="Telefone"
            value={form.telefone} onChange={(e) => set('telefone', e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400"
          />
        </div>

        <textarea
          placeholder="Conte um pouco sobre o que você precisa..." required rows={4}
          value={form.mensagem} onChange={(e) => set('mensagem', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 resize-none"
        />
      </div>

      {erro && <p className="text-red-600 text-sm mt-4">{erro}</p>}

      <button
        type="submit" disabled={loading}
        className="w-full bg-blue-600 text-white rounded-lg py-3 mt-6 font-semibold hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Enviar mensagem'}
      </button>

      <p className="text-center text-xs text-gray-400 mt-5">
        Sua mensagem será enviada para nossa equipe comercial.
      </p>
    </form>
  )
}

export default function Contato() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-6">
      <div className="w-full max-w-lg">
        <Suspense fallback={<div className="text-center text-gray-400">Carregando...</div>}>
          <FormularioContato />
        </Suspense>
      </div>
    </div>
  )
}