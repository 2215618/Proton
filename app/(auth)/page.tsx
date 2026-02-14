'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => Boolean(email.trim()) && Boolean(password.trim()), [email, password]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        if (data?.session) router.replace('/dashboard');
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  const handleDemo = () => {
    setEmail('demo@lginversiones.pe');
    setPassword('demo');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[920px] grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between p-8 rounded-3xl glass border border-slate-200/60 dark:border-slate-700/60 shadow-elev-2 overflow-hidden relative">
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/12 text-primary flex items-center justify-center ring-1 ring-primary/10">
                <span className="material-icons text-[28px]">apartment</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">LG CRM</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Inmobiliaria · Iquitos</p>
              </div>
            </div>

            <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Control total de tu inmobiliaria,
              <span className="text-primary"> en un solo panel</span>.
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300 max-w-md">
              Leads, inventario, agenda de visitas, tareas y clientes Gold List con presupuesto confirmado.
              <span className="text-slate-500 dark:text-slate-400"> </span>
              Modo demo (local-first) listo para Vercel.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
              <Feature icon="view_kanban" title="Pipeline" text="Seguimiento por etapas" />
              <Feature icon="home_work" title="Inventario" text="Venta (USD) / Alquiler (S/)" />
              <Feature icon="event" title="Agenda" text="Visitas programadas" />
              <Feature icon="stars" title="Gold List" text="Clientes calificados" />
            </div>
          </div>

          <div className="relative z-10 pt-8">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Consejo: luego conectamos Supabase sin cambiar pantallas.
            </p>
          </div>
        </div>

        {/* Login card */}
        <div className="p-8 sm:p-10 rounded-3xl glass border border-slate-200/60 dark:border-slate-700/60 shadow-elev-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Acceso</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ingresa para abrir el panel.</p>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                Demo
              </span>
              <button
                type="button"
                onClick={handleDemo}
                className="h-9 px-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 text-sm text-slate-700 dark:text-slate-200 hover:bg-white/75 dark:hover:bg-slate-900/30 transition-colors"
              >
                Autocompletar
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <Field label="Correo electrónico">
              <div className="relative">
                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                  mail_outline
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/20 pl-10 pr-3 text-sm text-slate-900 dark:text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  placeholder="nombre@empresa.com"
                  autoComplete="email"
                />
              </div>
            </Field>

            <Field label="Contraseña">
              <div className="relative">
                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                  lock_outline
                </span>
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/20 pl-10 pr-11 text-sm text-slate-900 dark:text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/20 hover:bg-white/80 dark:hover:bg-slate-900/30 transition-colors flex items-center justify-center"
                  aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <span className="material-icons text-[18px] text-slate-500">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </Field>

            {error && (
              <div className="rounded-2xl border border-rose-200/60 bg-rose-50/60 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {checking ? 'Verificando sesión…' : 'Modo local-first (costo cero).'}
              </p>

              <div className="sm:hidden">
                <button
                  type="button"
                  onClick={handleDemo}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Usar demo
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading || checking || !canSubmit}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>

            <div className="pt-5 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ¿No tienes acceso?{' '}
                <span className="text-primary font-semibold cursor-pointer hover:underline">Contactar al Administrador</span>
              </p>
            </div>
          </form>
        </div>
      </div>

      <footer className="fixed bottom-4 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs text-slate-400 font-medium">© {new Date().getFullYear()} LG Inversiones Inmobiliaria</p>
      </footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 p-4">
      <div className="flex items-center gap-2">
        <span className="material-icons text-primary text-[18px]">{icon}</span>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}
