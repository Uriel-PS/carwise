export default function Termos() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white/90 backdrop-blur border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <a href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] font-extrabold text-xl text-blue-950">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            CarWise
          </a>
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-blue-950 mb-2">Termos de Uso e Política de Privacidade</h1>
        <p className="text-sm text-gray-500 mb-8">Última atualização: Setembro de 2026</p>

        <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
          <section>
            <h2 className="text-xl font-bold text-blue-950 mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao criar uma conta e utilizar a plataforma CarWise, você concorda com estes Termos de Uso e com nossa Política de Privacidade.
              Se você não concorda com alguma parte destes termos, não deve utilizar nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-blue-950 mb-3">2. Nossos Serviços</h2>
            <p>
              A CarWise oferece serviços de consultoria automotiva pessoal. Atuamos como intermediários e facilitadores na busca,
              avaliação e negociação de veículos em nome do cliente. Os veículos sugeridos pertencem a concessionárias parceiras ou
              terceiros, e a CarWise não é proprietária, vendedora ou revendedora dos mesmos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-blue-950 mb-3">3. Política de Privacidade e LGPD</h2>
            <p>
              Coletamos os seguintes dados pessoais estritamente para a execução dos serviços de consultoria e análise de crédito:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Dados cadastrais:</strong> Nome, CPF, e-mail, telefone, endereço, estado civil e profissão.</li>
              <li><strong>Dados financeiros:</strong> Renda informada, intenção de financiamento e informações de restrição de crédito (quando informadas).</li>
            </ul>
            <p className="mt-3">
              <strong>Como usamos seus dados:</strong> Seus dados são utilizados para criar seu perfil na plataforma, comunicar-se sobre o andamento do serviço e, quando autorizado, realizar simulações ou consultas de crédito em bancos parceiros.
            </p>
            <p className="mt-2">
              <strong>Compartilhamento:</strong> Seus dados só serão compartilhados com concessionárias, financeiras ou despachantes na etapa final de negociação e elaboração de contratos, sempre visando concluir a transação de compra do veículo escolhido por você.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-blue-950 mb-3">4. Transparência em Comissões</h2>
            <p>
              Declaramos para todos os fins que a CarWise pode ser remunerada de duas formas simultâneas:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Pelo valor do plano de consultoria pago diretamente pelo cliente.</li>
              <li>Através de comissionamento repassado pelas concessionárias, financeiras e seguradoras parceiras caso o cliente efetue a compra, financiamento ou seguro através das nossas intermediações.</li>
            </ul>
            <p className="mt-2">
              Nosso compromisso é encontrar o melhor veículo para o cliente de forma isenta, priorizando as necessidades do comprador acima de quaisquer comissionamentos de terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-blue-950 mb-3">5. Limitação de Responsabilidade</h2>
            <p>
              Apesar de realizarmos curadoria e avaliação, os veículos semi-novos estão sujeitos ao desgaste natural de uso. 
              A responsabilidade por garantias mecânicas legais (motor e caixa) e problemas preexistentes não detectados cabe ao vendedor final do veículo (concessionária ou lojista), nos termos do Código de Defesa do Consumidor. A CarWise prestará suporte e auxílio na resolução de conflitos, mas não se responsabiliza solidariamente por defeitos ocultos no veículo após a efetivação da compra.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-blue-950 mb-3">6. Contato e Exclusão de Dados</h2>
            <p>
              Você tem o direito de solicitar a exclusão de seus dados pessoais, bem como uma cópia de tudo que temos armazenado sobre você. 
              Para qualquer solicitação referente aos seus dados, entre em contato através de: privacidade@carwise.com.br.
            </p>
          </section>
        </div>
        
        <div className="mt-12 text-center">
          <a href="/cadastro" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition">
            ← Voltar para o cadastro
          </a>
        </div>
      </main>
    </div>
  )
}
