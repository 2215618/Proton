'use client';
import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden bg-background-light">
       <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]" style={{
            backgroundImage: "radial-gradient(#137fec 0.5px, transparent 0.5px), radial-gradient(#137fec 0.5px, #f6f7f8 0.5px)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 10px 10px"
        }}></div>
      
      <div className="w-full max-w-md bg-white dark:bg-[#1A2633] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 p-8 sm:p-10 z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-primary">
            <span className="material-icons text-3xl">apartment</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">LG Inversiones</h2>
          <p className="text-sm text-slate-500 mt-2 text-center">Bienvenido de nuevo. Accede a tu panel.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Correo electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-icons text-slate-400 text-xl">mail_outline</span>
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm"
                placeholder="nombre@empresa.com"
              />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Contraseña</label>
             <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-icons text-slate-400 text-xl">lock_outline</span>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <div className="text-sm text-danger text-center">{error}</div>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

         <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
                ¿No tienes acceso? <span className="text-primary cursor-pointer hover:underline">Contactar al Administrador</span>
            </p>
        </div>
      </div>
      <footer className="absolute bottom-4 w-full text-center z-10 pointer-events-none">
        <p className="text-xs text-slate-400 font-medium">© 2024 LG Inversiones Inmobiliaria</p>
      </footer>
    </div>
  );
}