'use client';

import Sidebar from '@/components/Sidebar';
import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      if (!data?.session) {
        router.replace('/');
        return;
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-2 px-6 py-5 text-center">
          <div className="mx-auto h-11 w-11 rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/10 flex items-center justify-center">
            <span className="material-icons text-[24px]">dashboard</span>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">Cargando panel…</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Verificando sesión</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar />

      <main className="flex-1 overflow-hidden relative flex flex-col">
        {/* Soft background accents (light premium) */}
        <div className="pointer-events-none absolute inset-0 opacity-55">
          <div className="absolute -top-24 -left-28 h-64 w-64 rounded-full bg-primary/10 blur-2xl" />
          <div className="absolute top-8 -right-32 h-72 w-72 rounded-full bg-violet-500/10 blur-2xl" />
          <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-amber-400/10 blur-2xl" />
        </div>

        <div className="relative flex-1 overflow-hidden flex flex-col">{children}</div>
      </main>
    </div>
  );
}
