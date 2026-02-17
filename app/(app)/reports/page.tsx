'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Lead, Property, Visit, Task, LeadStage } from '@/types';
import { Button } from '@/components/ui/button';
import { formatMoney, formatDateShort, formatTimeShort } from '@/lib/utils';

type RangeKey = '7d' | '30d' | '90d' | 'all';

function parseAnyDate(input?: string | null) {
  if (!input) return null;
  const d = new Date(input.length === 10 ? `${input}T00:00:00` : input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function percent(n: number, d: number) {
  if (!d) return 0;
  return clamp(Math.round((n / d) * 100), 0, 100);
}

function groupCount(items: string[]) {
  const m = new Map<string, number>();
  for (const k of items) {
    const key = (k || '—').trim() || '—';
    m.set(key, (m.get(key) || 0) + 1);
  }
  return Array.from(m.entries())
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
}

function stageLabel(stage: LeadStage) {
  return stage;
}

function stageTone(stage: LeadStage) {
  if (stage === 'Nuevo') return 'bg-slate-50 text-slate-700 border-slate-200/60';
  if (stage === 'Contactado') return 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
  if (stage === 'Visita') return 'bg-amber-50 text-amber-800 border-amber-200/60';
  if (stage === 'Calificado') return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
  if (stage === 'Oferta') return 'bg-primary/10 text-primary border-primary/20';
  if (stage === 'Cierre') return 'bg-primary/10 text-primary border-primary/20';
  return 'bg-rose-50 text-rose-700 border-rose-200/60';
}

export default function ReportsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>('30d');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [q, setQ] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: l }, { data: p }, { data: v }, { data: t }] = await Promise.all([
      supabase.from('leads').select('*'),
      supabase.from('properties').select('*'),
      supabase.from('visits').select('*'),
      supabase.from('tasks').select('*'),
    ]);

    setLeads((l as Lead[]) || []);
    setProperties((p as Property[]) || []);
    setVisits((v as Visit[]) || []);
    setTasks((t as Task[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDate = useMemo(() => {
    if (range === 'all') return null;
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }, [range]);

  const filteredLeads = useMemo(() => {
    const s = q.trim().toLowerCase();
    return leads.filter((l) => {
      const d = parseAnyDate(l.created_at);
      if (startDate && d && d.getTime() < startDate.getTime()) return false;

      if (!s) return true;
      const hay = [l.name, l.phone || '', l.email || '', l.location || '', l.source || '', l.stage].join(' ').toLowerCase();
      return hay.includes(s);
    });
  }, [leads, q, startDate]);

  const filteredVisits = useMemo(() => {
    const s = q.trim().toLowerCase();
    return visits.filter((v) => {
      const d = parseAnyDate(v.scheduled_for) || parseAnyDate(v.created_at);
      if (startDate && d && d.getTime() < startDate.getTime()) return false;

      if (!s) return true;
      const hay = [v.status, v.notes || '', v.lead_id, v.property_id || '', v.scheduled_for].join(' ').toLowerCase();
      return hay.includes(s);
    });
  }, [visits, q, startDate]);

  const filteredTasks = useMemo(() => {
    const s = q.trim().toLowerCase();
    return tasks.filter((t) => {
      const d = parseAnyDate(t.created_at) || parseAnyDate(t.due_date);
      if (startDate && d && d.getTime() < startDate.getTime()) return false;

      if (!s) return true;
      // notes puede existir en DB demo aunque no esté en types
      const hay = [t.title, (t as any).notes || '', t.status, t.related_type || '', t.related_id || '', t.due_date || '']
        .join(' ')
        .toLowerCase();
      return hay.includes(s);
    });
  }, [tasks, q, startDate]);

  const filteredProperties = useMemo(() => {
    const s = q.trim().toLowerCase();
    return properties.filter((p) => {
      const d = parseAnyDate(p.created_at);
      if (startDate && d && d.getTime() < startDate.getTime()) return false;

      if (!s) return true;
      const hay = [p.title, p.location || '', p.address || '', p.property_type || '', p.operation, p.status].join(' ').toLowerCase();
      return hay.includes(s);
    });
  }, [properties, q, startDate]);

  const kpis = useMemo(() => {
    const totalLeads = filteredLeads.length;

    const calificado = filteredLeads.filter((l) => l.stage === 'Calificado').length;
    const oferta = filteredLeads.filter((l) => l.stage === 'Oferta').length;
    const cierre = filteredLeads.filter((l) => l.stage === 'Cierre').length;
    const perdido = filteredLeads.filter((l) => l.stage === 'Perdido').length;

    const leadWithNoContact = filteredLeads.filter((l) => !l.last_contacted_at).length;

    const totalProps = filteredProperties.length;
    const saleProps = filteredProperties.filter((p) => p.operation === 'sale').length;
    const rentProps = filteredProperties.filter((p) => p.operation === 'rent').length;

    const activeSaleUSD = filteredProperties
      .filter((p) => p.operation === 'sale' && p.status === 'Active')
      .reduce((sum, p) => sum + (p.price_sale || 0), 0);

    const activeRentPEN = filteredProperties
      .filter((p) => p.operation === 'rent' && p.status === 'Active')
      .reduce((sum, p) => sum + (p.price_rent || 0), 0);

    const totalVisits = filteredVisits.length;
    const vProg = filteredVisits.filter((v) => v.status === 'programada').length;
    const vDone = filteredVisits.filter((v) => v.status === 'completada').length;
    const vCancel = filteredVisits.filter((v) => v.status === 'cancelada').length;

    const totalTasks = filteredTasks.length;
    const openTasks = filteredTasks.filter((t) => t.status !== 'completed').length;

    const qualifiedBucket = calificado + oferta + cierre;

    return {
      totalLeads,
      calificado,
      oferta,
      cierre,
      perdido,
      leadWithNoContact,
      totalProps,
      saleProps,
      rentProps,
      activeSaleUSD,
      activeRentPEN,
      totalVisits,
      vProg,
      vDone,
      vCancel,
      totalTasks,
      openTasks,
      qualificationRate: percent(qualifiedBucket, totalLeads),
      closureRate: percent(cierre, Math.max(1, qualifiedBucket + perdido)),
    };
  }, [filteredLeads, filteredProperties, filteredVisits, filteredTasks]);

  const pipeline = useMemo(() => {
    const stages: LeadStage[] = ['Nuevo', 'Contactado', 'Visita', 'Calificado', 'Oferta', 'Cierre', 'Perdido'];
    const counts = stages.map((s) => ({
      stage: s,
      count: filteredLeads.filter((l) => l.stage === s).length,
    }));
    const max = Math.max(1, ...counts.map((c) => c.count));
    return { counts, max };
  }, [filteredLeads]);

  const topLeadLocations = useMemo(() => groupCount(filteredLeads.map((l) => l.location || '—')).slice(0, 6), [filteredLeads]);
  const topPropLocations = useMemo(() => groupCount(filteredProperties.map((p) => p.location || '—')).slice(0, 6), [filteredProperties]);
  const topSources = useMemo(() => groupCount(filteredLeads.map((l) => l.source || '—')).slice(0, 6), [filteredLeads]);

  const upcomingVisits = useMemo(() => {
    const now = Date.now();
    return visits
      .filter((v) => v.status === 'programada')
      .filter((v) => (parseAnyDate(v.scheduled_for)?.getTime() || 0) >= now)
      .sort((a, b) => (parseAnyDate(a.scheduled_for)?.getTime() || 0) - (parseAnyDate(b.scheduled_for)?.getTime() || 0))
      .slice(0, 10);
  }, [visits]);

  const railTotals = useMemo(() => {
    const saleActive = properties.filter((p) => p.operation === 'sale' && p.status === 'Active').length;
    const rentActive = properties.filter((p) => p.operation === 'rent' && p.status === 'Active').length;
    const open = tasks.filter((t) => t.status !== 'completed').length;
    const programadas = visits.filter((v) => v.status === 'programada').length;

    return { saleActive, rentActive, open, programadas };
  }, [properties, tasks, visits]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Controls (no header; AppTopbar is global in app/(app)/layout.tsx) */}
      <div className="px-6 md:px-8 pt-6 md:pt-8 flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ventana:{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {range === 'all' ? 'Todo' : range === '7d' ? '7 días' : range === '30d' ? '30 días' : '90 días'}
              </span>
              {' · '}
              Modo demo (local-first)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <div className="flex items-center gap-2 rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/20 px-3 h-10 shadow-elev-1 backdrop-blur-md">
              <span className="material-icons text-slate-400 text-[18px]">search</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="bg-transparent outline-none text-sm w-56 sm:w-72 placeholder:text-slate-400 text-slate-800 dark:text-slate-100"
                placeholder="Buscar en todo…"
              />
            </div>

            <select
              value={range}
              onChange={(e) => setRange(e.target.value as RangeKey)}
              className="h-10 rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/20 px-3 text-sm shadow-elev-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 backdrop-blur-md"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="all">Todo</option>
            </select>

            <Button variant="outline" className="h-10" onClick={fetchAll}>
              <span className="material-icons text-[18px]">refresh</span>
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main */}
        <main className="flex-1 overflow-y-auto aurora-bg-soft px-6 md:px-8 pb-6 md:pb-8 pt-4">
          {/* KPIs */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              icon="groups"
              title="Leads"
              value={String(kpis.totalLeads)}
              hint={`Calif: ${kpis.calificado} · Oferta: ${kpis.oferta} · Cierre: ${kpis.cierre}`}
              badge={`${kpis.qualificationRate}% avanzados`}
            />
            <KpiCard
              icon="home_work"
              title="Inventario"
              value={String(kpis.totalProps)}
              hint={`Venta: ${kpis.saleProps} · Alquiler: ${kpis.rentProps}`}
              badge="Activos"
            />
            <KpiCard
              icon="event"
              title="Visitas"
              value={String(kpis.totalVisits)}
              hint={`Prog: ${kpis.vProg} · Comp: ${kpis.vDone} · Canc: ${kpis.vCancel}`}
              badge="Agenda"
            />
            <KpiCard
              icon="task_alt"
              title="Tareas"
              value={String(kpis.totalTasks)}
              hint={`Pendientes: ${kpis.openTasks}`}
              badge={kpis.openTasks ? 'Priorizar' : 'Ok'}
            />
          </section>

          {/* Pipeline + Value */}
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
            <div className="xl:col-span-8 glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-1 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/35 dark:bg-slate-900/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-primary text-[18px]">insights</span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Pipeline</p>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Cierre: <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{kpis.closureRate}%</span>
                </span>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pipeline.counts.map((row) => {
                    const w = Math.round((row.count / pipeline.max) * 100);
                    return (
                      <div
                        key={row.stage}
                        className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${stageTone(row.stage)}`}>
                              {stageLabel(row.stage)}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Distribución</p>
                          </div>
                          <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{row.count}</span>
                        </div>

                        <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-primary/80" style={{ width: `${w}%` }} />
                        </div>

                        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                          {percent(row.count, kpis.totalLeads)}% del total
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/45 dark:bg-slate-900/20 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{kpis.leadWithNoContact}</span>{' '}
                    leads sin contacto registrado
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-200">
                    Potencial activo:{' '}
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatMoney(kpis.activeSaleUSD, 'USD')}
                    </span>{' '}
                    +{' '}
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatMoney(kpis.activeRentPEN, 'PEN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:col-span-4 space-y-6">
              <MiniList title="Top zonas (leads)" icon="location_on" items={topLeadLocations} empty="Aún no hay ubicaciones de leads." />
              <MiniList
                title="Top zonas (propiedades)"
                icon="map"
                items={topPropLocations}
                empty="Aún no hay ubicaciones de propiedades."
              />
              <MiniList title="Top fuentes" icon="campaign" items={topSources} empty="Aún no hay fuentes registradas." />
            </div>
          </section>

          {/* Upcoming visits */}
          <section className="mt-6 glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-1 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/35 dark:bg-slate-900/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-icons text-primary text-[18px]">schedule</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Próximas visitas</p>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{upcomingVisits.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/40 dark:bg-slate-900/20 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Fecha</th>
                    <th className="px-5 py-3 font-medium">Hora</th>
                    <th className="px-5 py-3 font-medium">Lead</th>
                    <th className="px-5 py-3 font-medium">Propiedad</th>
                    <th className="px-5 py-3 text-right font-medium">Estado</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
                  {upcomingVisits.map((v) => (
                    <tr key={v.id} className="hover:bg-white/50 dark:hover:bg-slate-900/25 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap tabular-nums">{formatDateShort(v.scheduled_for)}</td>
                      <td className="px-5 py-4 whitespace-nowrap tabular-nums">{formatTimeShort(v.scheduled_for)}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{v.lead_id.substring(0, 6)}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400"> · lead</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {v.property_id ? (
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{v.property_id.substring(0, 6)}</span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <span className="text-[11px] font-semibold px-2 py-1 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200/60">
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {!upcomingVisits.length && !loading && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                        No hay visitas programadas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {loading && (
            <div className="fixed bottom-4 right-4 glass rounded-2xl px-4 py-3 shadow-elev-2 border border-slate-200/60 dark:border-slate-700/60">
              <div className="text-xs text-slate-600 dark:text-slate-300">Cargando reportes…</div>
            </div>
          )}
        </main>

        {/* Right rail */}
        <aside className="hidden 2xl:flex w-[360px] border-l border-slate-200/60 dark:border-slate-700/60 p-6 md:p-8 overflow-y-auto">
          <div className="w-full space-y-6">
            <div className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-1 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/35 dark:bg-slate-900/20 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Resumen global</p>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                  Live
                </span>
              </div>

              <div className="p-4 text-sm text-slate-700 dark:text-slate-200 space-y-3">
                <Row label="Venta activa" value={`${railTotals.saleActive}`} />
                <Row label="Alquiler activo" value={`${railTotals.rentActive}`} />
                <Row label="Visitas programadas" value={`${railTotals.programadas}`} />
                <Row label="Tareas pendientes" value={`${railTotals.open}`} />
              </div>
            </div>

            <div className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-1 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/35 dark:bg-slate-900/20">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Checklist rápido</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sugerencias accionables (sin cambiar estructura).</p>
              </div>

              <div className="p-4 space-y-2 text-sm">
                <CheckItem
                  ok={kpis.leadWithNoContact === 0}
                  text={kpis.leadWithNoContact === 0 ? 'Todos los leads tienen contacto registrado' : 'Registrar último contacto en leads clave'}
                />
                <CheckItem ok={kpis.openTasks <= 5} text={kpis.openTasks <= 5 ? 'Carga de tareas saludable' : 'Reducir tareas pendientes (priorizar)'} />
                <CheckItem ok={kpis.vProg > 0} text={kpis.vProg > 0 ? 'Hay visitas programadas en la ventana' : 'Programar visitas para acelerar cierres'} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function KpiCard({ icon, title, value, hint, badge }: { icon: string; title: string; value: string; hint: string; badge: string }) {
  return (
    <div className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-1 overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">{hint}</p>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="h-10 w-10 rounded-2xl bg-primary/12 text-primary flex items-center justify-center ring-1 ring-primary/10">
            <span className="material-icons">{icon}</span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-white/60 dark:bg-slate-900/20 border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300">
            {badge}
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniList({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: string;
  items: { key: string; value: number }[];
  empty: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-1 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/35 dark:bg-slate-900/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-icons text-primary text-[18px]">{icon}</span>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {items.length ? (
          items.map((i) => {
            const w = Math.round((i.value / max) * 100);
            return (
              <div key={i.key} className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{i.key}</p>
                  <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{i.value}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-primary/80" style={{ width: `${w}%` }} />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300/70 dark:border-slate-700/60 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {empty}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function CheckItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 p-3">
      <div
        className={[
          'h-7 w-7 rounded-xl flex items-center justify-center ring-1',
          ok ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60' : 'bg-amber-50 text-amber-800 ring-amber-200/60',
        ].join(' ')}
      >
        <span className="material-icons text-[18px]">{ok ? 'check' : 'priority_high'}</span>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-200">{text}</p>
    </div>
  );
}
