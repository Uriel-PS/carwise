import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
});

export const metadata = {
  title: "CarWise — Consultoria automotiva pessoal",
  description: "Compre um carro com quem entende, não sozinho.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${barlow.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}