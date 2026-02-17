'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Lead, Property, Visit } from '@/types';
import { Button } from '@/components/ui/button';
import { formatDateShort, formatTimeShort } from '@/lib/utils';

type StatusFilter = 'all' | Visit['status'];

function ymd(d: Date) {
  // Local YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun - 6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameLocalDay(iso: string, date: Date) {
  const d = new Date(iso);
  return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
}

function statusTone(status: Visit['status']) {
  if (status === 'programada') return 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
  if (status === 'completada') return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
  return 'bg-rose-50 text-rose-700 border-rose-200/60';
}

function statusIcon(status: Visit['status']) {
  if (status === 'programada') return 'schedule';
  if (status === 'completada') return 'check_circle';
  return 'cancel';
}

export default function CalendarPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  const [weekOffset, setWeekOffset] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const [openNew, setOpenNew] = useState(false);
  const [creating, setCreating] = useState(false);

  const [openDetails, setOpenDetails] = useState(false);
  const [selected, setSelected] = useState<Visit | null>(null);
  const [updating, setUpdating] = useState(false);

  const [form, setForm] = useState({
    lead_id: '',
    property_id: '',
    date: '',
    time: '',
    status: 'programada' as Visit['status'],
    notes: '',
  });

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: v }, { data: l }, { data: p }] = await Promise.all([
      supabase.from('visits').select('*'),
      supabase.from('leads').select('*'),
      supabase.from('properties').select('*'),
    ]);
    setVisits((v as Visit[]) || []);
    setLeads((l as Lead[]) || []);
    setProperties((p as Property[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leadsById = useMemo(() => {
    const m = new Map<string, Lead>();
    for (const l of leads) m.set(l.id, l);
    return m;
  }, [leads]);

  const propsById = useMemo(() => {
    const m = new Map<string, Property>();
    for (const p of properties) m.set(p.id, p);
    return m;
  }, [properties]);

  const joinedVisits = useMemo(() => {
    return visits.map((v) => ({
      ...v,
      leads: leadsById.get(v.lead_id),
      properties: v.property_id ? propsById.get(v.property_id) : undefined,
    }));
  }, [visits, leadsById, propsById]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return joinedVisits
      .filter((v) => (status === 'all' ? true : v.status === status))
      .filter((v) => {
        if (!s) return true;
        const lead = v.leads;
        const prop = v.properties;
        const hay = [
          lead?.name || '',
          lead?.phone || '',
          lead?.email || '',
          lead?.location || '',
          prop?.title || '',
          prop?.location || '',
          prop?.address || '',
          v.notes || '',
          v.status,
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(s);
      })
      .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());
  }, [joinedVisits, q, status]);

  const weekStart = useMemo(() => {
    const base = startOfWeekMonday(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const weekStats = useMemo(() => {
    const weekKeys = new Set(days.map((d) => ymd(d)));
    const weekVisits = joinedVisits.filter((v) => {
      const key = ymd(new Date(v.scheduled_for));
      return weekKeys.has(key);
    });
    const programadas = weekVisits.filter((v) => v.status === 'programada').length;
    const completadas = weekVisits.filter((v) => v.status === 'completada').length;
    const canceladas = weekVisits.filter((v) => v.status === 'cancelada').length;
    return { programadas, completadas, canceladas, total: weekVisits.length };
  }, [joinedVisits, days]);

  const visitsByDay = useMemo(() => {
    const out: Record<string, Visit[]> = {};
    for (const d of days) out[ymd(d)] = [];
    for (const v of filtered) {
      for (const d of days) {
        if (isSameLocalDay(v.scheduled_for, d)) {
          out[ymd(d)].push(v);
          break;
        }
      }
    }
    return out;
  }, [filtered, days]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return joinedVisits
      .filter((v) => v.status === 'programada')
      .filter((v) => new Date(v.scheduled_for).getTime() >= now)
      .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
      .slice(0, 12);
  }, [joinedVisits]);

  function openNewVisit() {
    // Defaults: mañana 10:00
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const date = d.toISOString().slice(0, 10);
    setForm({
      lead_id: leads[0]?.id || '',
      property_id: '',
      date,
      time: '10:00',
      status: 'programada',
      notes: '',
    });
    setOpenNew(true);
  }

  async function handleCreateVisit() {
    if (!form.lead_id || !form.date || !form.time) return;
    setCreating(true);
    try {
      const scheduled_for = new Date(`${form.date}T${form.time}:00`).toISOString();
      const payload: Partial<Visit> = {
        org_id: 'org_demo',
        lead_id: form.lead_id,
        property_id: form.property_id || null,
        scheduled_for,
        status: form.status,
        notes: form.notes.trim() || null,
      };

      const { data } = await supabase.from('visits').insert(payload as any);
      if (data && Array.isArray(data)) setVisits((prev) => [data[0] as Visit, ...prev]);
      else await fetchAll();

      setOpenNew(false);
    } finally {
      setCreating(false);
    }
  }

  function openVisit(v: Visit) {
    setSelected(v);
    const d = new Date(v.scheduled_for);
    const date = d.toISOString().slice(0, 10);
    const time = d.toTimeString().slice(0, 5);
    setForm({
      lead_id: v.lead_id,
      property_id: v.property_id || '',
      date,
      time,
      status: v.status,
      notes: v.notes || '',
    });
    setOpenDetails(true);
  }

  async function handleUpdateVisit() {
    if (!selected) return;
    if (!form.lead_id || !form.date || !form.time) return;

    setUpdating(true);
    try {
      const scheduled_for = new Date(`${form.date}T${form.time}:00`).toISOString();
      const patch: Partial<Visit> = {
        lead_id: form.lead_id,
        property_id: form.property_id || null,
        scheduled_for,
        status: form.status,
        notes: form.notes.trim() || null,
      };

      // Optimistic
      setVisits((prev) => prev.map((v) => (v.id === selected.id ? ({ ...v, ...patch } as Visit) : v)));
      await supabase.from('visits').update(patch as any).eq('id', selected.id);

      setOpenDetails(false);
      setSelected(null);
    } finally {
      setUpdating(false);
    }
  }

  async function quickSetStatus(v: Visit, next: Visit['status']) {
    // Optimistic
    setVisits((prev) => prev.map((x) => (x.id === v.id ? ({ ...x, status: next } as Visit) : x)));
    if (selected?.id === v.id) setSelected({ ...v, status: next } as Visit);

    await supabase.from('visits').update({ status: next } as any).eq('id', v.id);
  }

  const headerRange = useMemo(() => {
    const a = days[0];
    const b = days[6];
    return `${a.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} – ${b.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}`;
  }, [days]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Controls (sin header duplicado; AppTopbar es global en app/(app)/layout.tsx) */}
      <div className="px-6 md:px-8 pt-6 md:pt-8 flex flex-col gap-3">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-primary/12 p-2 rounded-xl text-primary ring-1 ring-primary/10">
              <span className="material-icons">event</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight truncate">
                Agenda de Visitas
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Semana · <span className="font-semibold text-slate-900 dark:text-white">{headerRange}</span>
                {' · '}
                <span className="text-slate-400">Prog</span>{' '}
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{weekStats.programadas}</span>
                {' · '}
                <span className="text-slate-400">Comp</span>{' '}
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{weekStats.completadas}</span>
                {' · '}
                <span className="text-slate-400">Canc</span>{' '}
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{weekStats.canceladas}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end flex-wrap">
            <div className="hidden lg:flex items-center gap-2 rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 backdrop-blur-md px-3 h-10 shadow-elev-1">
              <span className="material-icons text-slate-400 text-[18px]">search</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="bg-transparent outline-none text-sm w-64 placeholder:text-slate-400 text-slate-800 dark:text-slate-100"
                placeholder="Buscar lead, zona, propiedad…"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="h-10 rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 px-3 text-sm shadow-elev-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 backdrop-blur-md"
            >
              <option value="all">Todos</option>
              <option value="programada">Programadas</option>
              <option value="completada">Completadas</option>
              <option value="cancelada">Canceladas</option>
            </select>

            <div className="hidden sm:flex items-center gap-1">
              <Button variant="outline" className="h-10" onClick={() => setWeekOffset((v) => v - 1)}>
                <span className="material-icons text-[18px]">chevron_left</span>
              </Button>
              <Button variant="outline" className="h-10" onClick={() => setWeekOffset(0)}>
                Hoy
              </Button>
              <Button variant="outline" className="h-10" onClick={() => setWeekOffset((v) => v + 1)}>
                <span className="material-icons text-[18px]">chevron_right</span>
              </Button>
            </div>

            <Button variant="outline" className="h-10" onClick={fetchAll}>
              <span className="material-icons text-[18px]">refresh</span>
              Actualizar
            </Button>

            <Button className="h-10" onClick={openNewVisit}>
              <span className="material-icons text-[18px]">add</span>
              Agendar
            </Button>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="flex-1 flex overflow-hidden pt-4">
        {/* Week grid */}
        <div className="flex-1 px-6 md:px-8 pb-6 md:pb-8 overflow-hidden">
          <div className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-1 h-full overflow-hidden">
            <div className="grid grid-cols-7 divide-x divide-slate-200/60 dark:divide-slate-700/60 h-full">
              {days.map((day) => {
                const key = ymd(day);
                const items = (visitsByDay[key] || []).sort(
                  (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
                );
                const isToday = ymd(new Date()) === key;

                return (
                  <div key={key} className="flex flex-col min-w-[220px]">
                    <div className="px-3 py-3 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/35 dark:bg-slate-900/20">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                            {day.toLocaleDateString('es-PE', { weekday: 'short' })}
                          </p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                            {day.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        <span
                          className={[
                            'text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums border',
                            isToday
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-white/60 dark:bg-slate-900/20 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60',
                          ].join(' ')}
                        >
                          {items.length}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
                      {items.map((v) => {
                        const lead = v.leads;
                        const prop = v.properties;
                        const canQuick = v.status === 'programada';

                        return (
                          <button
                            key={v.id}
                            onClick={() => openVisit(v)}
                            className="group w-full text-left rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 p-3 shadow-sm hover:shadow-elev-1 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                  {formatTimeShort(v.scheduled_for)}
                                </p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                  {lead?.name || `Lead ${v.lead_id.slice(0, 4)}`}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusTone(
                                    v.status
                                  )}`}
                                >
                                  <span className="material-icons text-[14px]">{statusIcon(v.status)}</span>
                                  {v.status}
                                </span>

                                {canQuick && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        quickSetStatus(v, 'completada');
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-xl border border-emerald-200/60 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center"
                                      aria-label="Marcar completada"
                                      title="Marcar completada"
                                    >
                                      <span className="material-icons text-[18px]">check</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        quickSetStatus(v, 'cancelada');
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-xl border border-rose-200/60 bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center justify-center"
                                      aria-label="Cancelar"
                                      title="Cancelar"
                                    >
                                      <span className="material-icons text-[18px]">close</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 truncate">
                              {prop?.title || '—'} {prop?.location ? `· ${prop.location}` : ''}
                            </p>

                            {v.notes && (
                              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{v.notes}</p>
                            )}
                          </button>
                        );
                      })}

                      {!items.length && (
                        <div className="rounded-2xl border border-dashed border-slate-300/70 dark:border-slate-700/60 p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                          Sin visitas
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upcoming panel */}
        <aside className="hidden xl:flex w-[360px] border-l border-slate-200/60 dark:border-slate-700/60 px-6 md:px-8 pb-6 md:pb-8 overflow-y-auto">
          <div className="w-full space-y-6">
            <div className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-1 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between bg-white/35 dark:bg-slate-900/20">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-primary text-[18px]">schedule</span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Próximas</p>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{upcoming.length}</span>
              </div>

              <div className="p-4 space-y-2">
                {upcoming.map((v) => {
                  const lead = v.leads;
                  const prop = v.properties;
                  return (
                    <button
                      key={v.id}
                      onClick={() => openVisit(v)}
                      className="group w-full text-left rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 p-3 hover:shadow-elev-1 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDateShort(v.scheduled_for)} ·{' '}
                          <span className="tabular-nums">{formatTimeShort(v.scheduled_for)}</span>
                        </p>
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusTone(v.status)}`}>
                            {v.status}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              quickSetStatus(v, 'completada');
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-xl border border-emerald-200/60 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center"
                            aria-label="Marcar completada"
                            title="Marcar completada"
                          >
                            <span className="material-icons text-[18px]">check</span>
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {lead?.name || `Lead ${v.lead_id.slice(0, 4)}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 truncate">{prop?.title || '—'}</p>
                    </button>
                  );
                })}

                {!upcoming.length && !loading && (
                  <div className="rounded-2xl border border-dashed border-slate-300/70 dark:border-slate-700/60 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    No hay visitas programadas.
                  </div>
                )}
              </div>
            </div>

            <div className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-1 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/35 dark:bg-slate-900/20">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Tips de operación</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Micro checklist para no perder cierres.</p>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <Tip
                  ok={weekStats.programadas > 0}
                  text={weekStats.programadas > 0 ? 'Tienes visitas programadas esta semana' : 'Programa visitas para acelerar cierres'}
                />
                <Tip
                  ok={weekStats.canceladas === 0}
                  text={
                    weekStats.canceladas === 0
                      ? 'Buen ratio: sin cancelaciones en la semana'
                      : 'Revisar causas de cancelación y confirmar con 1h de anticipación'
                  }
                />
                <Tip ok={q.trim().length === 0} text={q.trim().length === 0 ? 'Usa búsqueda para filtrar rápidamente' : 'Filtro aplicado: revisa resultados'} />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal: Create visit */}
      {openNew && (
        <ModalShell onClose={() => setOpenNew(false)} title="Agendar visita" subtitle="Crea una visita programada (modo demo).">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Lead *">
              <select
                className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={form.lead_id}
                onChange={(e) => setForm((s) => ({ ...s, lead_id: e.target.value }))}
              >
                {leads
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.phone ? `· ${l.phone}` : ''}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Propiedad (opcional)">
              <select
                className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={form.property_id}
                onChange={(e) => setForm((s) => ({ ...s, property_id: e.target.value }))}
              >
                <option value="">— Sin propiedad —</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Fecha *">
              <input
                type="date"
                className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={form.date}
                onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
              />
            </Field>

            <Field label="Hora *">
              <input
                type="time"
                className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={form.time}
                onChange={(e) => setForm((s) => ({ ...s, time: e.target.value }))}
              />
            </Field>

            <Field label="Estado">
              <select
                className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={form.status}
                onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as any }))}
              >
                <option value="programada">Programada</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </Field>

            <Field label="Notas (opcional)">
              <textarea
                className="min-h-[96px] w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Ej. Confirmar 1h antes…"
              />
            </Field>

            <div className="sm:col-span-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/40 dark:bg-slate-900/20 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Vista previa:{' '}
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  {form.date && form.time ? `${form.date} · ${form.time}` : '—'}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Button variant="secondary" onClick={() => setOpenNew(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateVisit} disabled={creating || !form.lead_id || !form.date || !form.time}>
              <span className="material-icons text-[18px]">event</span>
              {creating ? 'Agendando…' : 'Agendar'}
            </Button>
          </div>
        </ModalShell>
      )}

      {/* Modal: Details / update */}
      {openDetails && selected && (
        <ModalShell
          onClose={() => {
            setOpenDetails(false);
            setSelected(null);
          }}
          title="Detalle de visita"
          subtitle="Edita estado, fecha/hora y notas (modo demo)."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Lead *">
              <select
                className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={form.lead_id}
                onChange={(e) => setForm((s) => ({ ...s, lead_id: e.target.value }))}
              >
                {leads
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.phone ? `· ${l.phone}` : ''}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Propiedad (opcional)">
              <select
                className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={form.property_id}
                onChange={(e) => setForm((s) => ({ ...s, property_id: e.target.value }))}
              >
                <option value="">— Sin propiedad —</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Fecha *">
              <input
                type="date"
                className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={form.date}
                onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
              />
            </Field>

            <Field label="Hora *">
              <input
                type="time"
                className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={form.time}
                onChange={(e) => setForm((s) => ({ ...s, time: e.target.value }))}
              />
            </Field>

            <Field label="Estado">
              <select
                className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={form.status}
                onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as any }))}
              >
                <option value="programada">Programada</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </Field>

            <Field label="Notas (opcional)">
              <textarea
                className="min-h-[96px] w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              />
            </Field>

            <div className="sm:col-span-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/40 dark:bg-slate-900/20 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Programación:{' '}
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  {form.date && form.time ? `${form.date} · ${form.time}` : '—'}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => {
                setOpenDetails(false);
                setSelected(null);
              }}
            >
              Cerrar
            </Button>
            <Button onClick={handleUpdateVisit} disabled={updating || !form.lead_id || !form.date || !form.time}>
              <span className="material-icons text-[18px]">save</span>
              {updating ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </ModalShell>
      )}

      {loading && (
        <div className="fixed bottom-4 right-4 glass rounded-2xl px-4 py-3 shadow-elev-2 border border-slate-200/60 dark:border-slate-700/60">
          <div className="text-xs text-slate-600 dark:text-slate-300">Cargando agenda…</div>
        </div>
      )}
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
        <div
          className="w-full max-w-3xl rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-surface-dark shadow-elev-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
          </div>

          <div className="px-5 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</div>
      {children}
    </div>
  );
}

function Tip({ ok, text }: { ok: boolean; text: string }) {
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
