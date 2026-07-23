'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function PainelAdmin() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [clientes, setClientes] = useState([])
  const [consultores, setConsultores] = useState([])
  const [concessionarias, setConcessionarias] = useState([])
  const [mensagens, setMensagens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  // Formulário de novo consultor
  const [mostrarForm, setMostrarForm] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  // Formulário de nova concessionária
  const [mostrarFormConc, setMostrarFormConc] = useState(false)
  const [salvandoConc, setSalvandoConc] = useState(false)
  const [erroFormConc, setErroFormConc] = useState('')
  const [formConc, setFormConc] = useState({
    razao_social: '', nome_fantasia: '', cnpj: '', email: '', senha: '',
    telefone: '', cidade: '', estado: '', responsavel: '',
  })

  async function carregarTudo() {
    const { data: sessionData } = await supabase.auth.getSession()

    if (!sessionData.session) {
      router.push('/admin/login')
      return
    }

    const user = sessionData.session.user

    const { data: adminData } = await supabase
      .from('admins')
      .select('*')
      .eq('auth_id', user.id)
      .eq('ativo', true)
      .maybeSingle()

    if (!adminData) {
      router.push('/admin/login')
      return
    }

    setAdmin(adminData)

    const [rClientes, rConsultores, rConcessionarias, rMensagens] = await Promise.all([
      supabase.from('clientes').select('id, nome, email, created_at, consultor_id, consultores ( nome )').order('created_at', { ascending: false }),
      supabase.from('consultores').select('*').order('created_at', { ascending: false }),
      supabase.from('concessionarias').select('*').order('created_at', { ascending: false }),
      supabase.from('mensagens_contato').select('*').order('created_at', { ascending: false }),
    ])

    if (rClientes.error) setErro(rClientes.error.message)
    setClientes(rClientes.data || [])
    setConsultores(rConsultores.data || [])
    setConcessionarias(rConcessionarias.data || [])
    setMensagens(rMensagens.data || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarTudo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  async function criarConsultor(e) {
    e.preventDefault()
    setSalvando(true)
    setErroForm('')

    const resposta = await fetch('/api/criar-consultor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome, email: novoEmail, senha: novaSenha }),
    })

    const resultado = await resposta.json()
    setSalvando(false)

    if (!resposta.ok) {
      setErroForm(resultado.error || 'Erro ao criar consultor.')
      return
    }

    setNovoNome('')
    setNovoEmail('')
    setNovaSenha('')
    setMostrarForm(false)
    carregarTudo()
  }

  async function alternarAtivo(consultorId, ativoAtual) {
    await supabase
      .from('consultores')
      .update({ ativo: !ativoAtual })
      .eq('id', consultorId)
    carregarTudo()
  }

  function setConc(campo, valor) { setFormConc({ ...formConc, [campo]: valor }) }

  async function criarConcessionaria(e) {
    e.preventDefault()
    setSalvandoConc(true)
    setErroFormConc('')

    const resposta = await fetch('/api/criar-concessionaria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formConc),
    })

    const resultado = await resposta.json()
    setSalvandoConc(false)

    if (!resposta.ok) {
      setErroFormConc(resultado.error || 'Erro ao criar concessionária.')
      return
    }

    setFormConc({
      razao_social: '', nome_fantasia: '', cnpj: '', email: '', senha: '',
      telefone: '', cidade: '', estado: '', responsavel: '',
    })
    setMostrarFormConc(false)
    carregarTudo()
  }

  async function alternarAtivoConcessionaria(id, ativoAtual) {
    await supabase.from('concessionarias').update({ ativo: !ativoAtual }).eq('id', id)
    carregarTudo()
  }

  async function reatribuirConsultor(clienteId, consultorId) {
    const { error } = await supabase
      .from('clientes')
      .update({ consultor_id: consultorId || null })
      .eq('id', clienteId)

    if (error) {
      alert('Não foi possível atualizar o consultor: ' + error.message)
      return
    }

    carregarTudo()
  }

  async function marcarComoLida(id, lidaAtual) {
    await supabase.from('mensagens_contato').update({ lida: !lidaAtual }).eq('id', id)
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
            <div className="font-bold text-blue-950">CarWise <span className="text-xs font-mono font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full ml-1">Admin</span></div>
            <div className="text-xs text-gray-400">{admin?.nome}</div>
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

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Metrica label="Clientes cadastrados" valor={clientes.length} />
          <Metrica label="Consultores ativos" valor={consultores.filter(c => c.ativo).length} />
          <Metrica label="Consultores inativos" valor={consultores.filter(c => !c.ativo).length} />
          <Metrica label="Mensagens não lidas" valor={mensagens.filter(m => !m.lida).length} destaque={mensagens.filter(m => !m.lida).length > 0} />
        </div>

        {erro && (
          <p className="text-red-600 text-sm mb-5 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>
        )}

        {/* Gestão de consultores */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-blue-950 text-lg">Consultores</h2>
            <button
              onClick={() => setMostrarForm(!mostrarForm)}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {mostrarForm ? 'Cancelar' : '+ Novo consultor'}
            </button>
          </div>

          {mostrarForm && (
            <form onSubmit={criarConsultor} className="bg-blue-50/50 rounded-xl p-6 mb-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text" placeholder="Nome completo" required
                  value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400"
                />
                <input
                  type="email" placeholder="E-mail" required
                  value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400"
                />
              </div>
              <input
                type="password" placeholder="Senha temporária (mínimo 6 caracteres)" required minLength={6}
                value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400"
              />
              {erroForm && <p className="text-red-600 text-xs">{erroForm}</p>}
              <button
                type="submit" disabled={salvando}
                className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {salvando ? 'Criando...' : 'Criar consultor'}
              </button>
            </form>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="py-2 font-semibold">Nome</th>
                <th className="py-2 font-semibold">E-mail</th>
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {consultores.map((c) => (
                <tr key={c.id} className="border-t border-gray-50">
                  <td className="py-3 font-medium text-blue-950">{c.nome}</td>
                  <td className="py-3 text-gray-600">{c.email}</td>
                  <td className="py-3">
                    <span className={`text-xs font-mono px-2.5 py-1 rounded-full ${c.ativo ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {c.ativo ? 'ativo' : 'inativo'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => alternarAtivo(c.id, c.ativo)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      {c.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
              {consultores.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-gray-400">Nenhum consultor cadastrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Gestão de concessionárias */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-blue-950 text-lg">Concessionárias parceiras</h2>
            <button
              onClick={() => setMostrarFormConc(!mostrarFormConc)}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {mostrarFormConc ? 'Cancelar' : '+ Nova concessionária'}
            </button>
          </div>

          {mostrarFormConc && (
            <form onSubmit={criarConcessionaria} className="bg-blue-50/50 rounded-xl p-6 mb-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Razão social" required value={formConc.razao_social} onChange={(e) => setConc('razao_social', e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400" />
                <input type="text" placeholder="Nome fantasia" required value={formConc.nome_fantasia} onChange={(e) => setConc('nome_fantasia', e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="CNPJ" required value={formConc.cnpj} onChange={(e) => setConc('cnpj', e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400" />
                <input type="text" placeholder="Responsável" value={formConc.responsavel} onChange={(e) => setConc('responsavel', e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="email" placeholder="E-mail" required value={formConc.email} onChange={(e) => setConc('email', e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400" />
                <input type="text" placeholder="Telefone" value={formConc.telefone} onChange={(e) => setConc('telefone', e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400" />
              </div>
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <input type="text" placeholder="Cidade" value={formConc.cidade} onChange={(e) => setConc('cidade', e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400" />
                <input type="text" placeholder="UF" maxLength={2} value={formConc.estado} onChange={(e) => setConc('estado', e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400" />
              </div>
              <input type="password" placeholder="Senha temporária (mínimo 6 caracteres)" required minLength={6} value={formConc.senha} onChange={(e) => setConc('senha', e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400" />
              {erroFormConc && <p className="text-red-600 text-xs">{erroFormConc}</p>}
              <button type="submit" disabled={salvandoConc} className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {salvandoConc ? 'Criando...' : 'Criar concessionária'}
              </button>
            </form>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="py-2 font-semibold">Nome fantasia</th>
                <th className="py-2 font-semibold">E-mail</th>
                <th className="py-2 font-semibold">Cidade</th>
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {concessionarias.map((c) => (
                <tr key={c.id} className="border-t border-gray-50">
                  <td className="py-3 font-medium text-blue-950">{c.nome_fantasia}</td>
                  <td className="py-3 text-gray-600">{c.email}</td>
                  <td className="py-3 text-gray-600">{c.cidade ? `${c.cidade}/${c.estado}` : '—'}</td>
                  <td className="py-3">
                    <span className={`text-xs font-mono px-2.5 py-1 rounded-full ${c.ativo ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {c.ativo ? 'ativa' : 'inativa'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button onClick={() => alternarAtivoConcessionaria(c.id, c.ativo)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                      {c.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
              {concessionarias.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-gray-400">Nenhuma concessionária cadastrada ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Clientes recentes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="font-semibold text-blue-950 text-lg mb-6">Clientes e atribuição de consultor</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="py-2 font-semibold">Nome</th>
                <th className="py-2 font-semibold">E-mail</th>
                <th className="py-2 font-semibold">Cadastro</th>
                <th className="py-2 font-semibold">Consultor responsável</th>
              </tr>
            </thead>
            <tbody>
              {clientes.slice(0, 15).map((c) => (
                <tr key={c.id} className="border-t border-gray-50">
                  <td className="py-3 font-medium text-blue-950">{c.nome}</td>
                  <td className="py-3 text-gray-600">{c.email}</td>
                  <td className="py-3 text-gray-400 text-xs">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="py-3">
                    <select
                      value={c.consultor_id || ''}
                      onChange={(e) => reatribuirConsultor(c.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 bg-white"
                    >
                      <option value="">Sem consultor</option>
                      {consultores.filter(con => con.ativo).map((con) => (
                        <option key={con.id} value={con.id}>{con.nome}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mensagens de contato */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mt-6">
          <h2 className="font-semibold text-blue-950 text-lg mb-6">Mensagens de contato</h2>

          <div className="space-y-3">
            {mensagens.map((m) => (
              <div key={m.id} className={`border rounded-xl p-5 ${m.lida ? 'border-gray-100' : 'border-amber-200 bg-amber-50/40'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {!m.lida && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                      <h4 className="font-semibold text-blue-950">{m.nome}</h4>
                      <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {rotuloAssunto(m.assunto)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {m.email} {m.telefone && `· ${m.telefone}`} {m.empresa && `· ${m.empresa}`}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(m.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-3 break-words whitespace-pre-wrap">{m.mensagem}</p>
                <button
                  onClick={() => marcarComoLida(m.id, m.lida)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  {m.lida ? 'Marcar como não lida' : 'Marcar como lida'}
                </button>
              </div>
            ))}
            {mensagens.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-6">Nenhuma mensagem recebida ainda.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function rotuloAssunto(assunto) {
  const mapa = {
    concessionaria: 'Concessionária parceira',
    oficina: 'Credenciar oficina',
    seguradora: 'Seguradora / banco',
    trabalhe: 'Trabalhe conosco',
    outro: 'Outro assunto',
  }
  return mapa[assunto] || assunto
}

function Metrica({ label, valor, destaque }) {
  return (
    <div className={`rounded-2xl shadow-sm border p-6 text-center ${destaque ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
      <div className={`text-3xl font-bold mb-1 ${destaque ? 'text-amber-700' : 'text-blue-950'}`}>{valor}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}