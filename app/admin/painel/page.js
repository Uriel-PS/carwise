'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { useNotificacoesRealtime } from '../../lib/useNotificacoesRealtime'
import ToastNotificacao from '../../components/ToastNotificacao'

export default function PainelAdmin() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [clientes, setClientes] = useState([])
  const [consultores, setConsultores] = useState([])
  const [concessionarias, setConcessionarias] = useState([])
  const [veiculos, setVeiculos] = useState([])
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

  const {
    notificacoes,
    naoLidas: notificacoesCount,
    novaNotificacao,
    limparNovaNotificacao,
  } = useNotificacoesRealtime({
    tabela: 'notificacoes_admin',
    colunaId: 'admin_id',
    valorId: admin?.id,
    habilitado: !!admin?.id,
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

    const [rClientes, rConsultores, rConcessionarias, rMensagens, rVeiculos] = await Promise.all([
      supabase.from('clientes').select('id, nome, email, created_at, consultor_id, consultores ( nome ), pagamentos ( plano, status )').order('created_at', { ascending: false }),
      supabase.from('consultores').select('*').order('created_at', { ascending: false }),
      supabase.from('concessionarias').select('*').order('created_at', { ascending: false }),
      supabase.from('mensagens_contato').select('*').order('created_at', { ascending: false }),
      supabase.from('veiculos').select('id, marca, modelo, versao, ano_fabricacao, ano_modelo, cor, cambio, combustivel, km, preco, preco_negociacao, status, concessionarias ( nome_fantasia, cidade, estado )').order('created_at', { ascending: false }),
    ])

    if (rClientes.error) setErro(rClientes.error.message)
    setClientes(rClientes.data || [])
    setConsultores(rConsultores.data || [])
    setConcessionarias(rConcessionarias.data || [])
    setMensagens(rMensagens.data || [])
    setVeiculos(rVeiculos.data || [])
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

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    const resposta = await fetch('/api/criar-consultor', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    const resposta = await fetch('/api/criar-concessionaria', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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
            <span className="text-[11px] font-mono font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/admin/notificacoes"
              className="relative p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-xl transition"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {notificacoesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                  {notificacoesCount > 9 ? '9+' : notificacoesCount}
                </span>
              )}
            </a>
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

      <ToastNotificacao
        notificacao={novaNotificacao}
        onFechar={limparNovaNotificacao}
      />

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
          Conversas com Clientes
        </a>

        <a
          href="/admin/chats-consultores"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 text-blue-950 text-sm font-semibold px-5 py-2.5 rounded-lg hover:border-blue-300 transition mb-10 ml-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" stroke="#2B5FE0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Chat com Consultores
        </a>

	<a
	href="/admin/pagamentos"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 text-blue-950 text-sm font-semibold px-5 py-2.5 rounded-lg hover:border-blue-300 transition mb-10 ml-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="#2B5FE0" strokeWidth="1.6"/><path d="M2 10h20" stroke="#2B5FE0" strokeWidth="1.6"/></svg>
          Ver pagamentos
        </a>

        <a
          href="/admin/catalogo"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 text-blue-950 text-sm font-semibold px-5 py-2.5 rounded-lg hover:border-blue-300 transition mb-10 mt-3 sm:mt-0 sm:ml-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 16l-1 2h18l-1-2M5 11l2-4h10l2 4v5H5v-5z" stroke="#2B5FE0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="14" r="1" fill="#2B5FE0"/><circle cx="17" cy="14" r="1" fill="#2B5FE0"/></svg>
          Consultar catálogo
        </a>

        <a
          href="/admin/comissoes"
          className="inline-flex items-center gap-2 bg-white border border-gray-200 text-amber-600 text-sm font-semibold px-5 py-2.5 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition mb-10 mt-3 sm:mt-0 sm:ml-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v20m5-17H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Gerenciar comissões
        </a>

        {erro && (
          <p className="text-red-600 text-sm mb-5 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>
        )}

        {/* Gestão de consultores */}
        <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl text-blue-950 mb-1">
              Visão geral do sistema
            </h1>
            <p className="text-gray-400 text-sm">
              Aqui você gerencia consultores, concessionárias, clientes e estoque.
            </p>
          </div>
        </div>
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
            {(() => {
              let recentItems = []
              try {
                recentItems = JSON.parse(localStorage.getItem('recent_clients_admin') || '[]')
              } catch (e) {}

              // Backward compatibility: some might be strings, new ones are objects
              const recentMap = {}
              recentItems.forEach((item, index) => {
                const id = typeof item === 'object' ? item.id : item
                const ts = typeof item === 'object' ? item.timestamp : null
                recentMap[String(id)] = { index, timestamp: ts }
              })

              const sortByRecent = (a, b) => {
                const itemA = recentMap[String(a.id)]
                const itemB = recentMap[String(b.id)]
                if (itemA && itemB) return itemA.index - itemB.index
                if (itemA) return -1
                if (itemB) return 1
                return new Date(b.created_at) - new Date(a.created_at) // default
              }

              // Inject timestamp into client object for UI
              const clientesSorted = [...clientes].map(c => ({
                ...c,
                ultimoAcesso: recentMap[String(c.id)]?.timestamp
              })).sort(sortByRecent)

              const clientesComPlano = clientesSorted.filter(c => c.pagamentos?.some(p => p.status === 'confirmado'))
              const clientesSemPlano = clientesSorted.filter(c => !c.pagamentos?.some(p => p.status === 'confirmado'))

              return (
                <>
                  <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">Clientes sem Plano</h2>
                  <SecaoTabelaAdmin maxHeight="220px">
                    <TabelaClientesAdmin 
                      clientes={clientesSemPlano} 
                      router={router} 
                      reatribuirConsultor={reatribuirConsultor} 
                      consultores={consultores}
                    />
                  </SecaoTabelaAdmin>

                  <h2 className="text-sm font-bold text-gray-700 mb-2 px-1 mt-8">Clientes com Plano Ativo</h2>
                  <SecaoTabelaAdmin maxHeight="600px">
                    <TabelaClientesAdmin 
                      clientes={clientesComPlano} 
                      router={router} 
                      reatribuirConsultor={reatribuirConsultor}
                      consultores={consultores}
                    />
                  </SecaoTabelaAdmin>
                </>
              )
            })()}
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
function IconVeiculo() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 16l-1 2h18l-1-2" stroke="#B07830" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 11l2-4h10l2 4v5H5v-5z" stroke="#B07830" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="14" r="1" fill="#B07830"/><circle cx="17" cy="14" r="1" fill="#B07830"/></svg>
}

function SecaoTabelaAdmin({ children, maxHeight = '220px' }) {
  const [expandido, setExpandido] = useState(false)
  const [precisaExpandir, setPrecisaExpandir] = useState(false)
  const innerRef = useRef(null)

  useEffect(() => {
    const el = innerRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      const maxH = parseInt(maxHeight.replace('px', ''))
      if (el.scrollHeight > maxH) {
        setPrecisaExpandir(true)
      } else {
        setPrecisaExpandir(false)
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [maxHeight])

  return (
    <div className="relative border border-gray-100 rounded-xl overflow-hidden mb-6">
      <div
        className={`transition-all duration-300 overflow-hidden ${
          expandido || !precisaExpandir ? '' : ''
        }`}
        style={{
          maxHeight: expandido || !precisaExpandir ? 'none' : maxHeight,
          ...( !expandido && precisaExpandir ? { maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' } : {} )
        }}
      >
        <div ref={innerRef}>
          {children}
        </div>
      </div>
      {!expandido && precisaExpandir && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end pb-2 pointer-events-none">
          <button
            onClick={() => setExpandido(true)}
            className="pointer-events-auto text-sm font-semibold text-blue-600 hover:text-blue-800 transition bg-white/90 backdrop-blur border border-blue-100 shadow-sm px-5 py-2 rounded-full"
          >
            Ver mais
          </button>
        </div>
      )}
      {expandido && precisaExpandir && (
        <div className="mt-4 pb-4 text-center">
          <button
            onClick={() => setExpandido(false)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition bg-blue-50 px-4 py-1.5 rounded-full"
          >
            Ver menos
          </button>
        </div>
      )}
    </div>
  )
}

function TabelaClientesAdmin({ clientes, router, reatribuirConsultor, consultores }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50/70 text-left text-[11px] text-gray-400 uppercase tracking-wider">
          <th className="px-6 py-3 font-semibold">Nome</th>
          <th className="px-6 py-3 font-semibold">E-mail</th>
          <th className="px-6 py-3 font-semibold">Cadastro</th>
          <th className="px-6 py-3 font-semibold">Plano</th>
          <th className="px-6 py-3 font-semibold">Consultor responsável</th>
        </tr>
      </thead>
      <tbody>
        {clientes.map((c) => (
          <tr key={c.id} className="border-t border-gray-50 hover:bg-blue-50/30 transition">
            <td
              className="px-6 py-3 font-medium text-blue-950 cursor-pointer hover:underline"
              onClick={() => router.push(`/admin/cliente/${c.id}`)}
            >
              <div>{c.nome}</div>
              {c.ultimoAcesso && (
                <div className="text-[10px] text-gray-400 font-normal mt-0.5 no-underline">
                  Acessado: {new Date(c.ultimoAcesso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </td>
            <td className="px-6 py-3 text-gray-500">{c.email}</td>
            <td className="px-6 py-3 text-gray-400 text-xs">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
            <td className="px-6 py-3 text-gray-500 text-xs font-semibold">
              {c.pagamentos?.find(p => p.status === 'confirmado')?.plano || '—'}
            </td>
            <td className="px-6 py-3">
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
        {clientes.length === 0 && (
          <tr>
            <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">
              Nenhum cliente encontrado.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}