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
        'w-64 h-full flex-shrink-0 z-20',
        'border-r border-slate-200/60 dark:border-slate-700/60',
        'bg-white/70 dark:bg-surface-dark/70 backdrop-blur-xl',
        'shadow-elev-1'
      )}
    >
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-elev-1">
            LG
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight text-slate-900 dark:text-white">
              LG Inversiones
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              CRM Inmobiliario
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                isActive
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/15 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800/50',
                'hover:translate-x-[1px]'
              )}
            >
              <span
                className={cn(
                  'material-icons text-[20px] transition-colors',
                  isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300'
                )}
              >
                {item.icon}
              </span>

              <span className="truncate">{item.label}</span>

              <span
                className={cn(
                  'pointer-events-none absolute left-1 top-2 bottom-2 w-[3px] rounded-full bg-primary transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-0'
                )}
              />
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60">
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium',
            'text-slate-600 hover:text-danger hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800/50',
            'transition-all duration-150'
          )}
        >
          <span className="material-icons text-[20px]">logout</span>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
