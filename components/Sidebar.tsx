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
        'border-r border-white/10',
        'bg-[#0B1B2A]',
        'shadow-elev-2'
      )}
    >
      {/* soft highlights */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_520px_at_20%_-10%,rgba(36,107,253,0.28),transparent_60%),radial-gradient(680px_460px_at_90%_0%,rgba(124,58,237,0.18),transparent_62%)] opacity-70" />

      {/* Brand */}
      <div className="relative h-16 flex items-center px-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-blue-500 to-rose-500 flex items-center justify-center text-white font-bold text-lg shadow-elev-2">
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
                isActive
                  ? 'bg-gradient-to-r from-white/14 to-white/6 text-white ring-1 ring-white/10 shadow-elev-1'
                  : 'text-slate-200/85 hover:text-white hover:bg-white/6',
                'hover:translate-x-[1px]'
              )}
            >
              <span
                className={cn(
                  'material-icons text-[20px] transition-colors',
                  isActive ? 'text-[#AFC7FF]' : 'text-slate-300/70 group-hover:text-slate-200'
                )}
              >
                {item.icon}
              </span>

              <span className="truncate">{item.label}</span>

              <span
                className={cn(
                  'pointer-events-none absolute left-1 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-primary to-indigo-400 transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-0'
                )}
              />
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium',
            'text-slate-200/85 hover:text-white hover:bg-white/6',
            'transition-all duration-150'
          )}
        >
          <span className="material-icons text-[20px] text-slate-300/70">logout</span>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
