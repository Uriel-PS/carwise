import ConsultorLayout from './ConsultorLayout'

export const metadata = {
  title: 'Painel do Consultor — CarWise',
  description: 'Centro de operações do consultor CarWise',
}

export default function Layout({ children }) {
  return <ConsultorLayout>{children}</ConsultorLayout>
}
