'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    newLeads: 0,
    uncontacted: 0,
    visitsToday: 0,
    visitsWeek: 0,
    overdueTasks: 0,
    tasksToday: 0,
    activeDeals: 0,
    pipelineValue: 0,
  });
  const [todaysVisits, setTodaysVisits] = useState<any[]>([]);
  const [todaysTasks, setTodaysTasks] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
       // In a real app with RLS, these queries work directly. 
       // Mocking the counts logic via Supabase queries structure.
       
       const { count: newLeads } = await supabase.from('leads').select('*', { count: 'exact', head: true }); 
       // For MVP simulation without complex date queries on empty DB, we use raw counts or simplified logic
       
       const { count: activeDeals } = await supabase
         .from('leads')
         .not('stage', 'in', '("Perdido","Cierre","Nuevo")')
         .select('*', { count: 'exact', head: true });
       
       // Calculate sums manually or via RPC in production.
       const { data: dealsData } = await supabase
         .from('leads')
         .not('stage', 'in', '("Perdido")')
         .select('budget_min, budget_max');
       const pipelineValue = dealsData?.reduce((acc, curr) => acc + ((curr.budget_min || 0) + (curr.budget_max || 0)) / 2, 0) || 0;

       setStats({
         newLeads: newLeads || 0,
         uncontacted: 5, // Mock for demo if no data
         visitsToday: 4,
         visitsWeek: 18,
         overdueTasks: 3,
         tasksToday: 12,
         activeDeals: activeDeals || 0,
         pipelineValue: pipelineValue,
       });

       // Fetch tables
       // Mock data for visual fidelity if empty
       setTodaysVisits([
         { time: '10:00 AM', client: 'Juan Perez', property: 'Apts. Miraflores', status: 'Pendiente' },
         { time: '12:30 PM', client: 'Maria Garcia', property: 'Casa San Isidro', status: 'Confirmada' },
       ]);

       setTodaysTasks([
         { title: 'Llamar a prospecto nuevo', sub: 'Lead: Ana Torres', status: 'vencido' },
         { title: 'Enviar contrato borrador', sub: 'Deal: Venta Penthouse', status: 'pending' },
       ]);
    }
    fetchData();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="h-16 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-10 sticky top-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Hola, Bienvenido</h1>
          <p className="text-xs text-slate-500">Resumen de actividad hoy.</p>
        </div>
        <div className="flex gap-4">
            <button className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
             + Nuevo
            </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard icon="person_add" label="Nuevos Leads (7d)" value={stats.newLeads} color="text-primary" bg="bg-primary/10" />
            <KpiCard icon="warning" label="Sin Contacto" value={stats.uncontacted} color="text-danger" bg="bg-red-50" isDanger />
            <KpiCard icon="location_on" label="Visitas de Hoy" value={stats.visitsToday} color="text-indigo-500" bg="bg-indigo-50" />
            <KpiCard icon="calendar_view_week" label="Visitas Semanales" value={stats.visitsWeek} color="text-slate-500" bg="bg-slate-50" />
            <KpiCard icon="assignment_late" label="Tareas Vencidas" value={stats.overdueTasks} color="text-warning" bg="bg-orange-50" />
            <KpiCard icon="task_alt" label="Tareas de Hoy" value={stats.tasksToday} color="text-blue-500" bg="bg-blue-50" />
            <KpiCard icon="handshake" label="Negocios Activos" value={stats.activeDeals} color="text-emerald-500" bg="bg-emerald-50" />
            <div className="bg-primary text-white p-4 rounded-lg shadow-lg flex flex-col justify-between h-32 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                <div className="relative z-10">
                    <span className="material-icons bg-white/20 p-1 rounded mb-2">attach_money</span>
                    <p className="text-sm text-blue-100 font-medium">Valor Pipeline</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(stats.pipelineValue)}</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6">Pipeline por Etapa</h3>
                <div className="flex items-end space-x-6 h-48 w-full px-2">
                    {/* Visual Mock of Bar Chart */}
                    {['Prospecto', 'Calificado', 'Visita', 'Propuesta', 'Cierre'].map((label, i) => (
                        <div key={label} className="flex flex-col items-center flex-1 group">
                            <div className="w-full bg-primary/20 rounded-t-sm relative h-full group-hover:bg-primary/30 transition-colors flex items-end">
                                <div className={`w-full ${i===4 ? 'bg-success' : 'bg-primary'} rounded-t-sm`} style={{ height: `${[60, 40, 80, 30, 15][i]}%` }}></div>
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 mt-3 text-center uppercase">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6">Conversión</h3>
                <div className="flex flex-col space-y-3">
                     <FunnelStep label="Leads" value="142" width="100%" color="border-primary" />
                     <FunnelStep label="Contactados" value="86" width="85%" color="border-primary/80" />
                     <FunnelStep label="Visitas" value="42" width="60%" color="border-primary/60" />
                     <FunnelStep label="Cierres" value="8" width="35%" color="border-success" />
                </div>
                <div className="mt-4 text-center">
                    <span className="text-xs text-slate-500">Tasa Global: <strong className="text-slate-900">5.6%</strong></span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
            <div className="bg-white rounded-lg shadow-sm border border-slate-100 flex flex-col">
                 <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Visitas de Hoy</h3>
                    <Link href="/calendar" className="text-xs font-medium text-primary hover:underline">Ver Calendario →</Link>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="px-5 py-3 font-medium">Hora</th>
                            <th className="px-5 py-3 font-medium">Cliente</th>
                            <th className="px-5 py-3 font-medium">Propiedad</th>
                            <th className="px-5 py-3 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {todaysVisits.map((v, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="px-5 py-3 font-semibold text-slate-700">{v.time}</td>
                                <td className="px-5 py-3">{v.client}</td>
                                <td className="px-5 py-3 text-slate-500">{v.property}</td>
                                <td className="px-5 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">{v.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-100 flex flex-col">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Tareas de Hoy</h3>
                    <Link href="/tasks" className="text-xs font-medium text-primary hover:underline">Ver Todo →</Link>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {todaysTasks.map((t, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg group border border-transparent hover:border-slate-100">
                            <input type="checkbox" className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"/>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                                <p className="text-xs text-slate-500">{t.sub} {t.status==='vencido' && <span className="text-danger ml-1">Vencido</span>}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color, bg, isDanger }: any) {
    return (
        <div className={`bg-white p-4 rounded-lg shadow-sm border ${isDanger ? 'border-red-100' : 'border-slate-100'} flex flex-col justify-between h-32`}>
            <div className="flex justify-between items-start">
                <div className={`p-2 ${bg} rounded-md ${color}`}>
                    <span className="material-icons text-[20px]">{icon}</span>
                </div>
            </div>
            <div>
                <p className={`text-sm text-slate-500 font-medium ${isDanger ? 'text-red-500' : ''}`}>{label}</p>
                <p className={`text-2xl font-bold mt-1 ${isDanger ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
            </div>
        </div>
    )
}

function FunnelStep({ label, value, width, color }: any) {
    return (
        <div className="relative h-10 w-full mx-auto" style={{ width }}>
            <div className="absolute inset-0 bg-slate-50 rounded flex items-center px-3 justify-between z-0 w-full border border-slate-100">
                <span className="text-xs font-medium text-slate-600">{label}</span>
                <span className="text-xs font-bold text-slate-900">{value}</span>
            </div>
            <div className={`absolute inset-y-0 left-0 bg-transparent rounded-l w-full z-10 border-l-4 ${color}`}></div>
        </div>
    )
}
