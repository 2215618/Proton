'use client';
import Link from 'next/link';
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
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside
      className={cn(
        'relative w-64 h-full flex-shrink-0 z-20 text-slate-100',
        // Aurora Premium shell
        'border-r border-white/10 dark:border-slate-800/60',
        'bg-[#0B1B2A]',
        'shadow-elev-2 overflow-hidden'
      )}
    >
      {/* Aurora glow background */}
      <div className="pointer-events-none absolute inset-0 opacity-75 bg-[radial-gradient(900px_560px_at_18%_-10%,rgba(36,107,253,0.30),transparent_60%),radial-gradient(760px_520px_at_95%_0%,rgba(124,58,237,0.22),transparent_62%),radial-gradient(740px_520px_at_50%_120%,rgba(16,185,129,0.10),transparent_58%)]" />
      {/* Subtle vignette */}
      <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(1200px_800px_at_50%_20%,transparent_30%,rgba(0,0,0,0.55)_100%)]" />
      {/* Top hairline */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-white/10" />

      {/* Brand */}
      <div className="relative h-16 flex items-center px-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-blue-500 to-rose-500 flex items-center justify-center text-white font-bold text-lg shadow-elev-2">
            <span className="pointer-events-none absolute inset-0 rounded-xl bg-white/10" />
            LG
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight text-white">LG Inversiones</div>
            <div className="text-[11px] text-slate-300/80">CRM Inmobiliario</div>
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
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                // Hover motion
                'hover:translate-x-[1px]',
                isActive
                  ? 'text-white ring-1 ring-white/12 shadow-elev-1'
                  : 'text-slate-200/85 hover:text-white hover:bg-white/6'
              )}
            >
              {/* Active gradient plate */}
              <span
                className={cn(
                  'pointer-events-none absolute inset-0 rounded-xl transition-opacity',
                  isActive
                    ? 'opacity-100 bg-[linear-gradient(90deg,rgba(255,255,255,0.16),rgba(255,255,255,0.06))]'
                    : 'opacity-0'
                )}
              />
              {/* Hover glow */}
              <span className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(420px_220px_at_20%_30%,rgba(36,107,253,0.20),transparent_60%)]" />

              {/* Active indicator bar */}
              <span
                className={cn(
                  'pointer-events-none absolute left-1 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-primary to-indigo-400 transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-0'
                )}
              />

              <span
                className={cn(
                  'relative material-icons text-[20px] transition-colors',
                  isActive ? 'text-[#AFC7FF]' : 'text-slate-300/70 group-hover:text-slate-200'
                )}
              >
                {item.icon}
              </span>

              <span className="relative truncate">{item.label}</span>

              {/* Active chevron */}
              <span
                className={cn(
                  'relative ml-auto material-icons text-[18px] text-slate-300/60 transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                )}
              >
                chevron_right
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className={cn(
            'group w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium',
            'text-slate-200/85 hover:text-white hover:bg-white/6',
            'transition-all duration-150 hover:translate-x-[1px]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30'
          )}
        >
          <span className="material-icons text-[20px] text-slate-300/70 group-hover:text-slate-200">logout</span>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
