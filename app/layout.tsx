import './globals.css'
import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: {
    default: 'LG CRM — Inmobiliaria',
    template: '%s · LG CRM',
  },
  description:
    'CRM inmobiliario (local-first) para leads, inventario, agenda, tareas y clientes Gold List.',
  applicationName: 'LG CRM',
  metadataBase: undefined,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Icons */}
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />

        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#0B5FFF" />
      </head>

      <body className="min-h-screen font-sans antialiased text-text-main bg-background-light dark:bg-background-dark">
        {children}
      </body>
    </html>
  )
}
