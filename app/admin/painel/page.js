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

  const [mostrarForm, setMostrarForm] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')

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
        <p className="text-gray-400 text-sm">Carregando...</p>
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
            <span className="text-[11px] font-mono font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">{admin?.nome}</span>
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

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Metrica label="Clientes cadastrados" valor={clientes.length} />
          <Metrica label="Consultores ativos" valor={consultores.filter(c => c.ativo).length} />
          <Metrica label="Consultores inativos" valor={consultores.filter(c => !c.ativo).length} />
          <Metrica label="Mensagens não lidas" valor={mensagens.filter(m => !m.lida).length} destaque={mensagens.filter(m => !m.lida).length > 0} />
        </div>

        <a
          href="/admin/chats"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 text-blue-950 text-sm font-semibold px-5 py-2.5 rounded-lg hover:border-blue-300 transition mb-10"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#2B5FE0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Ver todas as conversas
        </a>

	<a
	href="/admin/pagamentos"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 text-blue-950 text-sm font-semibold px-5 py-2.5 rounded-lg hover:border-blue-300 transition mb-10 ml-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="#2B5FE0" strokeWidth="1.6"/><path d="M2 10h20" stroke="#2B5FE0" strokeWidth="1.6"/></svg>
          Ver pagamentos
        </a>

        {erro && (
          <p className="text-red-600 text-sm mb-5 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>
        )}

        {/* Gestão de consultores */}
        <Cartao titulo="Consultores" icon={<IconConsultor />}
          acao={
            <button
              onClick={() => setMostrarForm(!mostrarForm)}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {mostrarForm ? 'Cancelar' : '+ Novo consultor'}
            </button>
          }
        >
          {mostrarForm && (
            <form onSubmit={criarConsultor} className="bg-blue-50/50 rounded-xl p-6 mb-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Campo placeholder="Nome completo" required value={novoNome} onChange={setNovoNome} />
                <Campo type="email" placeholder="E-mail" required value={novoEmail} onChange={setNovoEmail} />
              </div>
              <Campo type="password" placeholder="Senha temporária (mínimo 6 caracteres)" required minLength={6} value={novaSenha} onChange={setNovaSenha} />
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
              <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider">
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
                  <td className="py-3 text-gray-500">{c.email}</td>
                  <td className="py-3">
                    <Badge ativo={c.ativo} textoAtivo="ativo" textoInativo="inativo" />
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
                <tr><td colSpan={4} className="py-8 text-center text-gray-400 text-sm">Nenhum consultor cadastrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </Cartao>

        {/* Gestão de concessionárias */}
        <Cartao titulo="Concessionárias parceiras" icon={<IconConcessionaria />}
          acao={
            <button
              onClick={() => setMostrarFormConc(!mostrarFormConc)}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {mostrarFormConc ? 'Cancelar' : '+ Nova concessionária'}
            </button>
          }
        >
          {mostrarFormConc && (
            <form onSubmit={criarConcessionaria} className="bg-blue-50/50 rounded-xl p-6 mb-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Campo placeholder="Razão social" required value={formConc.razao_social} onChange={(v) => setConc('razao_social', v)} />
                <Campo placeholder="Nome fantasia" required value={formConc.nome_fantasia} onChange={(v) => setConc('nome_fantasia', v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Campo placeholder="CNPJ" required value={formConc.cnpj} onChange={(v) => setConc('cnpj', v)} />
                <Campo placeholder="Responsável" value={formConc.responsavel} onChange={(v) => setConc('responsavel', v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Campo type="email" placeholder="E-mail" required value={formConc.email} onChange={(v) => setConc('email', v)} />
                <Campo placeholder="Telefone" value={formConc.telefone} onChange={(v) => setConc('telefone', v)} />
              </div>
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <Campo placeholder="Cidade" value={formConc.cidade} onChange={(v) => setConc('cidade', v)} />
                <Campo placeholder="UF" maxLength={2} value={formConc.estado} onChange={(v) => setConc('estado', v)} />
              </div>
              <Campo type="password" placeholder="Senha temporária (mínimo 6 caracteres)" required minLength={6} value={formConc.senha} onChange={(v) => setConc('senha', v)} />
              {erroFormConc && <p className="text-red-600 text-xs">{erroFormConc}</p>}
              <button type="submit" disabled={salvandoConc} className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {salvandoConc ? 'Criando...' : 'Criar concessionária'}
              </button>
            </form>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider">
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
                  <td className="py-3 text-gray-500">{c.email}</td>
                  <td className="py-3 text-gray-500">{c.cidade ? `${c.cidade}/${c.estado}` : '—'}</td>
                  <td className="py-3">
                    <Badge ativo={c.ativo} textoAtivo="ativa" textoInativo="inativa" />
                  </td>
                  <td className="py-3 text-right">
                    <button onClick={() => alternarAtivoConcessionaria(c.id, c.ativo)} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                      {c.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
              {concessionarias.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">Nenhuma concessionária cadastrada ainda.</td></tr>
              )}
            </tbody>
          </table>
        </Cartao>

        {/* Clientes e atribuição */}
        <Cartao titulo="Clientes e atribuição de consultor" icon={<IconCliente />}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider">
                <th className="py-2 font-semibold">Nome</th>
                <th className="py-2 font-semibold">E-mail</th>
                <th className="py-2 font-semibold">Cadastro</th>
                <th className="py-2 font-semibold">Consultor responsável</th>
              </tr>
            </thead>
            <tbody>
              {clientes.slice(0, 15).map((c) => (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-blue-50/30 transition">
                  <td
                    className="py-3 font-medium text-blue-950 cursor-pointer hover:underline"
                    onClick={() => router.push(`/admin/cliente/${c.id}`)}
                  >
                    {c.nome}
                  </td>
                  <td className="py-3 text-gray-500">{c.email}</td>
                  <td className="py-3 text-gray-400 text-xs">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="py-3">
                    <select
                      value={c.consultor_id || ''}
                      onChange={(e) => reatribuirConsultor(c.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 bg-white focus:border-blue-400 focus:outline-none"
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
        </Cartao>

        {/* Mensagens de contato */}
        <Cartao titulo="Mensagens de contato" icon={<IconMensagem />}>
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
              <div className="text-center text-gray-400 text-sm py-8">Nenhuma mensagem recebida ainda.</div>
            )}
          </div>
        </Cartao>

      </div>
    </div>
  )
}

function Cartao({ titulo, icon, acao, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <h2 className="font-[family-name:var(--font-display)] font-semibold text-blue-950 text-lg">{titulo}</h2>
        </div>
        {acao}
      </div>
      {children}
    </div>
  )
}

function Campo({ onChange, ...props }) {
  return (
    <input
      {...props}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none transition w-full"
    />
  )
}

function Badge({ ativo, textoAtivo, textoInativo }) {
  return (
    <span className={`text-xs font-mono px-2.5 py-1 rounded-full ${ativo ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
      {ativo ? textoAtivo : textoInativo}
    </span>
  )
}

function Metrica({ label, valor, destaque }) {
  return (
    <div className={`rounded-2xl shadow-sm border p-6 text-center ${destaque ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
      <div className={`font-[family-name:var(--font-display)] text-3xl font-bold mb-1 ${destaque ? 'text-amber-700' : 'text-blue-950'}`}>{valor}</div>
      <div className="text-xs text-gray-400">{label}</div>
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

function IconConsultor() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="#B07830" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h11" stroke="#B07830" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function IconConcessionaria() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" stroke="#B07830" strokeWidth="1.6" strokeLinejoin="round"/></svg>
}
function IconCliente() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12z" stroke="#B07830" strokeWidth="1.6"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" stroke="#B07830" strokeWidth="1.6" strokeLinecap="round"/></svg>
}
function IconMensagem() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6l9 6 9-6M3 6v12h18V6" stroke="#B07830" strokeWidth="1.6" strokeLinejoin="round"/></svg>
}