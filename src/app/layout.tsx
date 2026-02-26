// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Configuración de la pantalla del celular (Evita que el usuario haga zoom por accidente)
export const viewport: Viewport = {
  themeColor: "#3E2723", // Color café oscuro de Nespresso para la barra superior de Android/iOS
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Metadatos de la aplicación (Lo que lee Google, WhatsApp al compartir el link, y el celular al instalarla)
export const metadata: Metadata = {
  title: "Nespresso | Portal Operativo",
  description: "Plataforma de gestión de ventas, inventarios y alertas para embajadores de café Nespresso. by lcmc",
  manifest: "/manifest.json", // Archivo mágico que la convierte en App Instalable
  appleWebApp: {
    capable: true, // Permite que se instale en iOS como app nativa
    statusBarStyle: "black-translucent",
    title: "Nespresso Op",
  },
  formatDetection: {
    telephone: false, // Evita que los números de serie se conviertan en links de llamadas
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Cambiamos a español de México para que el navegador no pregunte si quieres traducir la página
    <html lang="es-MX"> 
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}