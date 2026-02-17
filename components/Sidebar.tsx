'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/kanban', label: 'Leads / Pipeline', icon: 'contacts' },
  { href: '/inventory', label: 'Propiedades', icon: 'real_estate_agent' },
  { href: '/gold-list', label: 'Gold List', icon: 'star' },
  { href: '/calendar', label: 'Calendario', icon: 'calendar_month' },
  { href: '/tasks', label: 'Tareas', icon: 'task' },
  { href: '/chat', label: 'Chat & Notas', icon: 'chat' },
  { href: '/reports', label: 'Reportes', icon: 'analytics' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setEmail(data.user?.email ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside
      className={cn(
        'relative w-64 h-full flex-shrink-0 z-20',
        // Light Aurora (default)
        'text-slate-900 border-r border-slate-200/60 bg-white/70 backdrop-blur-md shadow-elev-2',
        // Dark compatible
        'dark:text-slate-100 dark:border-white/10 dark:bg-[#0B1B2A]'
      )}
    >
      {/* Aurora background (light/dark) */}
      <div className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-75">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/12 blur-2xl" />
        <div className="absolute top-10 -right-24 h-80 w-80 rounded-full bg-violet-500/12 blur-2xl" />
        <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-emerald-400/10 blur-2xl" />
      </div>

      {/* Brand */}
      <div className="relative h-16 flex items-center px-5 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-primary via-indigo-500 to-violet-500 shadow-elev-1 ring-1 ring-white/30 flex items-center justify-center">
            <span className="material-icons text-white text-[22px]">home</span>
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-semibold tracking-tight text-slate-900 dark:text-white truncate">LG CRM</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-300/80 truncate">CRM Inmobiliario</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto py-5 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl font-semibold transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                isActive
                  ? 'bg-violet-50/90 dark:bg-white/10 text-slate-900 dark:text-white shadow-elev-1 ring-1 ring-violet-200/60 dark:ring-white/10'
                  : 'text-slate-700 dark:text-slate-200/85 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/6',
                'hover:translate-x-[1px]'
              )}
            >
              <span
                className={cn(
                  'h-9 w-9 rounded-2xl flex items-center justify-center ring-1 transition-colors shrink-0',
                  isActive
                    ? 'bg-white/70 dark:bg-slate-900/20 text-violet-700 dark:text-[#AFC7FF] ring-violet-200/60 dark:ring-white/10'
                    : 'bg-white/55 dark:bg-slate-900/10 text-slate-500 dark:text-slate-300/70 ring-slate-200/60 dark:ring-white/10 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                )}
              >
                <span className="material-icons text-[20px]">{item.icon}</span>
              </span>

              <span className="truncate">{item.label}</span>

              {/* Active marker */}
              <span
                className={cn(
                  'pointer-events-none absolute left-1 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-violet-500 to-indigo-500 transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-0'
                )}
              />
            </Link>
          );
        })}
      </nav>

      {/* Footer: user + logout */}
      <div className="relative p-4 border-t border-slate-200/60 dark:border-white/10 space-y-3">
        <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white/60 dark:bg-slate-900/10 backdrop-blur-md p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-elev-1 ring-1 ring-white/25 flex items-center justify-center">
              <span className="material-icons text-[20px]">person</span>
            </div>
            <div className="min-w-0 leading-tight">
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {email ? 'Sesión activa' : 'Usuario'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-300/80 truncate">
                {email ? email : 'LG CRM'}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold',
            'border border-slate-200/60 dark:border-white/10',
            'bg-white/55 dark:bg-slate-900/10 hover:bg-white/75 dark:hover:bg-white/6',
            'text-slate-700 hover:text-slate-900 dark:text-slate-200/85 dark:hover:text-white',
            'transition-all duration-150'
          )}
        >
          <span className="material-icons text-[20px] text-slate-500 dark:text-slate-300/70">logout</span>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
