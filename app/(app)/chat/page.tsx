'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ChatPage() {
  // NOTA: Este módulo es SOLO UI (sin conexión WhatsApp por ahora).
  // Se mantiene el apartado, sin agregar integraciones ni lógica externa.

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Left: Conversations */}
      <aside className="w-[320px] shrink-0 border-r border-slate-200/60 dark:border-slate-700/60 bg-white/40 dark:bg-slate-900/10 backdrop-blur supports-[backdrop-filter]:bg-white/30 flex flex-col">
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 glass">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Conversaciones</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Vista previa (sin WhatsApp)</p>
          </div>
          <Link
            href="/kanban"
            className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
            title="Ir a Leads"
          >
            Leads
          </Link>
        </div>

        <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/20 px-3 h-10 shadow-sm">
            <span className="material-icons text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Buscar lead…"
              className="w-full bg-transparent outline-none text-sm placeholder:text-slate-400 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Item activo */}
          <button className="w-full text-left px-4 py-3 border-b border-slate-200/40 dark:border-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-900/20 transition-colors border-l-4 border-l-primary bg-primary/5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">Juan Perez</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Interesado en propiedad…
                </p>
              </div>
              <span className="text-[11px] text-slate-400 tabular-nums whitespace-nowrap">10:42</span>
            </div>
          </button>

          {/* Placeholder */}
          <div className="p-4">
            <div className="rounded-2xl border border-dashed border-slate-300/70 dark:border-slate-700/60 p-5 text-sm text-slate-500 dark:text-slate-400">
              Por ahora este módulo es una vista UI. Cuando integremos WhatsApp, aquí se listarán conversaciones reales.
            </div>
          </div>
        </div>
      </aside>

      {/* Center: Chat */}
      <main className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(37,99,235,0.12),transparent_55%),radial-gradient(900px_circle_at_90%_0%,rgba(59,130,246,0.10),transparent_55%)]">
        {/* Sub-header de conversación (no es el AppTopbar global) */}
        <header className="h-14 px-6 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 glass shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/10 flex items-center justify-center">
              <span className="material-icons text-[18px]">person</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">Juan Perez</p>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Demo
                </span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="truncate">Sin conexión WhatsApp</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/tasks" className="hidden sm:inline-flex">
              <Button variant="outline" className="h-10">
                <span className="material-icons text-[18px]">task_alt</span>
                Tareas
              </Button>
            </Link>

            <Link href="/calendar" className="hidden sm:inline-flex">
              <Button variant="outline" className="h-10">
                <span className="material-icons text-[18px]">event</span>
                Agenda
              </Button>
            </Link>

            {/* Icon-only en mobile */}
            <Link href="/tasks" className="sm:hidden">
              <Button variant="outline" className="h-10 w-10 p-0" aria-label="Tareas">
                <span className="material-icons text-[18px]">task_alt</span>
              </Button>
            </Link>
            <Link href="/calendar" className="sm:hidden">
              <Button variant="outline" className="h-10 w-10 p-0" aria-label="Agenda">
                <span className="material-icons text-[18px]">event</span>
              </Button>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Bubble: inbound */}
          <div className="flex justify-start">
            <div className="max-w-[520px] rounded-2xl rounded-tl-none border border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/25 shadow-elev-1 px-4 py-3">
              <p className="text-sm text-slate-800 dark:text-slate-100">
                Hola, me interesa la propiedad. ¿Está disponible?
              </p>
              <span className="text-[10px] text-slate-400 block text-right mt-1 tabular-nums">10:42</span>
            </div>
          </div>

          {/* Bubble: outbound */}
          <div className="flex justify-end">
            <div className="max-w-[520px] rounded-2xl rounded-tr-none border border-primary/15 bg-primary/10 dark:bg-primary/15 shadow-elev-1 px-4 py-3">
              <p className="text-sm text-slate-900 dark:text-white">
                ¡Hola Juan! Sí, está disponible. ¿Buscas para inversión o vivienda?
              </p>
              <span className="text-[10px] text-slate-500 block text-right mt-1 tabular-nums">10:45</span>
            </div>
          </div>

          {/* Note */}
          <div className="flex justify-center py-2">
            <div className="rounded-full border border-amber-200/60 bg-amber-50 text-amber-800 text-xs px-3 py-1 flex items-center gap-2">
              <span className="material-icons text-[16px]">lock</span>
              Nota interna: cliente motivado, presupuesto USD 180k
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/15 backdrop-blur px-4 py-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <Button variant="secondary" className="h-9">
              Nota interna
            </Button>
            <Link href="/tasks">
              <Button variant="secondary" className="h-9">
                Crear tarea
              </Button>
            </Link>
            <Link href="/calendar">
              <Button variant="secondary" className="h-9">
                Agendar visita
              </Button>
            </Link>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 h-11 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              placeholder="Escribe un mensaje… (demo)"
            />
            <Button className="h-11 px-4">
              <span className="material-icons text-[18px]">send</span>
              Enviar
            </Button>
          </div>

          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            * Este módulo no está conectado a WhatsApp. Más adelante lo activamos sin cambiar estructura.
          </p>
        </div>
      </main>

      {/* Right: Contact info */}
      <aside className="hidden xl:flex w-[320px] shrink-0 border-l border-slate-200/60 dark:border-slate-700/60 bg-white/40 dark:bg-slate-900/10 backdrop-blur supports-[backdrop-filter]:bg-white/30 flex-col">
        <div className="h-14 px-6 flex items-center border-b border-slate-200/60 dark:border-slate-700/60 glass">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Info contacto</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">juan.perez@gmail.com</p>
          </div>

          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Teléfono</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">+51 965 608 934</p>
          </div>

          <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Propiedades sugeridas</p>
              <Link href="/inventory" className="text-xs text-primary hover:underline">
                Ver inventario
              </Link>
            </div>

            <div className="mt-3 space-y-3">
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/20 p-3">
                <div className="h-20 rounded-xl bg-slate-200/70 dark:bg-slate-800/60" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-2">Casa moderna con piscina</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Urbanización Miami · USD 180,000</p>
                <Button variant="outline" className="h-9 w-full mt-3">
                  Enviar (demo)
                </Button>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
              * Sugerencias reales se activan cuando integremos datos + WhatsApp.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
