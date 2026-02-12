'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

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
    <aside className="w-64 bg-white dark:bg-surface-dark border-r border-slate-200 dark:border-slate-800 flex flex-col h-full flex-shrink-0 z-20">
      <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg">
            LG
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">LG Inversiones</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              <span className={cn("material-icons text-[20px]", isActive ? "text-primary" : "")}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-500 hover:text-danger transition-colors"
        >
          <span className="material-icons">logout</span>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
