import './globals.css'
import type { Metadata } from 'next'
import React from 'react';

export const metadata: Metadata = {
  title: 'Stitch CRM',
  description: 'Real Estate CRM',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body className="font-sans antialiased text-text-main bg-background-light dark:bg-background-dark">
        {children}
      </body>
    </html>
  )
}