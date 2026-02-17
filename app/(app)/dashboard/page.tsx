'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Lead, LeadStage, Property, Task, Visit } from '@/types';
import { Button } from '@/components/ui/button';
import { formatMoney, formatDateShort, formatTimeShort } from '@/lib/utils';

type NewKind = 'lead' | 'property' | 'visit' | 'task';

function ymdLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateOnly(ymd?: string | null) {
  if (!ymd) return null;
  const dt = new Date(ymd.length === 10 ? `${ymd}T00:00:00` : ymd);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function within(d: Date, a: Date, b: Date) {
  return d.getTime() >= a.getTime() && d.getTime() <= b.getTime();
}

const STAGES: LeadStage[] = ['Nuevo', 'Contactado', 'Visita', 'Calificado', 'Oferta', 'Cierre', 'Perdido'];

export default function DashboardPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [openNew, setOpenNew] = useState(false);
  const [newKind, setNewKind] = useState<NewKind>('lead');
  const [creating, setCreating] = useState(false);

  // Forms (minimal, functional)
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'Facebook',
    location: '',
    stage: 'Nuevo' as LeadStage,
    budget_min: '',
    budget_max: '',
  });

  const [propertyForm, setPropertyForm] = useState({
    title: '',
    operation: 'sale' as Property['operation'],
    price_sale: '',
    price_rent: '',
    location: '',
    property_type: 'Casa',
    bedrooms: '',
    bathrooms: '',
    area_sqm: '',
    status: 'Active' as Property['status'],
    address: '',
    description: '',
  });

  const [visitForm, setVisitForm] = useState({
    lead_id: '',
    property_id: '',
    scheduled_for: '',
    notes: '',
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    due_date: '',
    related_type: 'lead' as Task['related_type'] | 'none',
    related_id: '',
    notes: '',
  });

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

  const stats = useMemo(() => {
    const now = new Date();

    const last7 = new Date();
    last7.setDate(last7.getDate() - 7);

    const todayA = startOfDay(now);
    const todayB = endOfDay(now);

    const weekB = new Date();
    weekB.setDate(weekB.getDate() + 7);
    const weekA = todayA;

    // Leads
    const newLeads7d = leads.filter((l) => {
      const d = new Date(l.created_at);
      return !Number.isNaN(d.getTime()) && d.getTime() >= last7.getTime();
    }).length;

    const uncontacted = leads.filter((l) => !l.last_contacted_at && l.stage !== 'Perdido').length;

    const activePipeline = leads.filter((l) => l.stage !== 'Perdido' && l.stage !== 'Cierre').length;

    // Visits
    const visitsToday = visits.filter((v) => {
      const d = new Date(v.scheduled_for);
      return v.status === 'programada' && !Number.isNaN(d.getTime()) && within(d, todayA, todayB);
    }).length;

    const visitsWeek = visits.filter((v) => {
      const d = new Date(v.scheduled_for);
      return v.status === 'programada' && !Number.isNaN(d.getTime()) && within(d, weekA, weekB);
    }).length;

    // Tasks
    const overdueTasks = tasks.filter((t) => {
      if (t.status === 'completed') return false;
      const d = parseDateOnly(t.due_date);
      if (!d) return false;
      return d.getTime() < todayA.getTime();
    }).length;

    const tasksToday = tasks.filter((t) => {
      if (t.status === 'completed') return false;
      const d = parseDateOnly(t.due_date);
      if (!d) return false;
      return d.getTime() === todayA.getTime();
    }).length;

    // Inventory value (bimoneda)
    const activeSaleUSD = properties
      .filter((p) => p.status === 'Active' && p.operation === 'sale')
      .reduce((sum, p) => sum + (p.price_sale || 0), 0);

    const activeRentPEN = properties
      .filter((p) => p.status === 'Active' && p.operation === 'rent')
      .reduce((sum, p) => sum + (p.price_rent || 0), 0);

    return {
      newLeads7d,
      uncontacted,
      visitsToday,
      visitsWeek,
      overdueTasks,
      tasksToday,
      activePipeline,
      activeSaleUSD,
      activeRentPEN,
    };
  }, [leads, visits, tasks, properties]);

  const nextVisits = useMemo(() => {
    const now = Date.now();
    return visits
      .filter((v) => v.status === 'programada')
      .filter((v) => (new Date(v.scheduled_for).getTime() || 0) >= now)
      .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
      .slice(0, 6);
  }, [visits]);

  const nextTasks = useMemo(() => {
    const today = startOfDay(new Date());
    return tasks
      .filter((t) => t.status !== 'completed')
      .slice()
      .sort((a, b) => {
        const da = parseDateOnly(a.due_date)?.getTime() ?? Infinity;
        const db = parseDateOnly(b.due_date)?.getTime() ?? Infinity;
        if (da !== db) return da - db;
        return (a.created_at || '').localeCompare(b.created_at || '');
      })
      .slice(0, 6)
      .map((t) => ({
        ...t,
        isOverdue: (parseDateOnly(t.due_date)?.getTime() ?? Infinity) < today.getTime(),
        isToday: (parseDateOnly(t.due_date)?.getTime() ?? -1) === today.getTime(),
      }));
  }, [tasks]);

  const latestLeads = useMemo(() => {
    return leads
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 6);
  }, [leads]);

  function resetModal(kind: NewKind) {
    setNewKind(kind);
    const now = new Date();
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);

    setLeadForm({
      name: '',
      phone: '',
      email: '',
      source: 'Facebook',
      location: '',
      stage: 'Nuevo',
      budget_min: '',
      budget_max: '',
    });

    setPropertyForm({
      title: '',
      operation: 'sale',
      price_sale: '',
      price_rent: '',
      location: '',
      property_type: 'Casa',
      bedrooms: '',
      bathrooms: '',
      area_sqm: '',
      status: 'Active',
      address: '',
      description: '',
    });

    setVisitForm({
      lead_id: leads[0]?.id || '',
      property_id: properties[0]?.id || '',
      scheduled_for: new Date(now.getTime() + 1000 * 60 * 60 * 2).toISOString().slice(0, 16),
      notes: '',
    });

    setTaskForm({
      title: '',
      due_date: ymdLocal(tmr),
      related_type: 'lead',
      related_id: leads[0]?.id || '',
      notes: '',
    });
  }

  function openNewModal() {
    resetModal('lead');
    setOpenNew(true);
  }

  async function createLead() {
    if (!leadForm.name.trim()) return;

    const payload: Partial<Lead> = {
      org_id: 'org_demo',
      name: leadForm.name.trim(),
      phone: leadForm.phone.trim() || null,
      email: leadForm.email.trim() || null,
      source: leadForm.source.trim() || null,
      location: leadForm.location.trim() || null,
      stage: leadForm.stage,
      budget_min: leadForm.budget_min ? Number(leadForm.budget_min) : null,
      budget_max: leadForm.budget_max ? Number(leadForm.budget_max) : null,
      assigned_to: null,
      last_contacted_at: null,
    };

    const { data } = await supabase.from('leads').insert(payload as any);
    if (data && Array.isArray(data)) setLeads((prev) => [data[0] as Lead, ...prev]);
    else await fetchAll();
  }

  async function createProperty() {
    if (!propertyForm.title.trim()) return;

    const payload: Partial<Property> = {
      org_id: 'org_demo',
      title: propertyForm.title.trim(),
      operation: propertyForm.operation,
      status: propertyForm.status,
      location: propertyForm.location.trim() || null,
      property_type: propertyForm.property_type.trim() || null,
      address: propertyForm.address.trim() || null,
      description: propertyForm.description.trim() || null,
      bedrooms: propertyForm.bedrooms ? Number(propertyForm.bedrooms) : null,
      bathrooms: propertyForm.bathrooms ? Number(propertyForm.bathrooms) : null,
      area_sqm: propertyForm.area_sqm ? Number(propertyForm.area_sqm) : null,
      price_sale:
        propertyForm.operation === 'sale' ? (propertyForm.price_sale ? Number(propertyForm.price_sale) : null) : null,
      price_rent:
        propertyForm.operation === 'rent' ? (propertyForm.price_rent ? Number(propertyForm.price_rent) : null) : null,
      amenities: null,
    };

    const { data } = await supabase.from('properties').insert(payload as any);
    if (data && Array.isArray(data)) setProperties((prev) => [data[0] as Property, ...prev]);
    else await fetchAll();
  }

  async function createVisit() {
    if (!visitForm.lead_id || !visitForm.scheduled_for) return;

    const payload: Partial<Visit> = {
      org_id: 'org_demo',
      lead_id: visitForm.lead_id,
      property_id: visitForm.property_id || null,
      scheduled_for: new Date(visitForm.scheduled_for).toISOString(),
      status: 'programada',
      notes: visitForm.notes.trim() || null,
    };

    const { data } = await supabase.from('visits').insert(payload as any);
    if (data && Array.isArray(data)) setVisits((prev) => [data[0] as Visit, ...prev]);
    else await fetchAll();
  }

  async function createTask() {
    if (!taskForm.title.trim()) return;

    const relType: Task['related_type'] =
      taskForm.related_type === 'none' ? null : (taskForm.related_type as Task['related_type']);

    const payload: Partial<Task> & { notes?: string | null } = {
      org_id: 'org_demo',
      title: taskForm.title.trim(),
      due_date: taskForm.due_date || null,
      status: 'pending',
      related_type: relType,
      related_id: relType ? (taskForm.related_id || null) : null,
      assignee_id: null,
      notes: taskForm.notes.trim() || null,
    };

    const { data } = await supabase.from('tasks').insert(payload as any);
    if (data && Array.isArray(data)) setTasks((prev) => [data[0] as Task, ...prev]);
    else await fetchAll();
  }

  async function handleCreate() {
    setCreating(true);
    try {
      if (newKind === 'lead') await createLead();
      if (newKind === 'property') await createProperty();
      if (newKind === 'visit') await createVisit();
      if (newKind === 'task') await createTask();
      setOpenNew(false);
    } finally {
      setCreating(false);
    }
  }

  const modalPrimaryDisabled = useMemo(() => {
    if (newKind === 'lead') return !leadForm.name.trim();
    if (newKind === 'property') return !propertyForm.title.trim();
    if (newKind === 'visit') return !visitForm.lead_id || !visitForm.scheduled_for;
    if (newKind === 'task') return !taskForm.title.trim();
    return true;
  }, [newKind, leadForm.name, propertyForm.title, visitForm.lead_id, visitForm.scheduled_for, taskForm.title]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Acción superior (NO header, para evitar duplicados con AppTopbar global) */}
      <div className="px-6 md:px-8 pt-6 md:pt-8 flex items-center justify-end gap-2">
        <Button variant="outline" className="h-10" onClick={fetchAll}>
          <span className="material-icons text-[18px]">refresh</span>
          Actualizar
        </Button>
        <Button className="h-10" onClick={openNewModal}>
          <span className="material-icons text-[18px]">add</span>
          Nuevo
        </Button>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 md:pb-8 pt-4">
        {/* KPI grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard icon="person_add" label="Nuevos leads (7d)" value={stats.newLeads7d} badge="Captación" />
          <KpiCard icon="phone_missed" label="Sin contacto" value={stats.uncontacted} badge="Prioridad" tone="danger" />
          <KpiCard icon="location_on" label="Visitas hoy" value={stats.visitsToday} badge="Agenda" tone="info" />
          <KpiCard icon="task_alt" label="Tareas hoy" value={stats.tasksToday} badge="Operación" tone="success" />
        </section>

        {/* Value row */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
          <div className="xl:col-span-8 rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/65 dark:bg-surface-dark/40 backdrop-blur-md shadow-elev-1 overflow-hidden relative">
            <div className="pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-primary to-indigo-500" />
            <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-icons text-primary text-[18px]">insights</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Indicadores clave</p>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Próx 7 días:{' '}
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{stats.visitsWeek}</span> visitas
              </span>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Metric title="Pipeline activo" value={`${stats.activePipeline}`} sub="Leads en seguimiento (excluye perdido/cierre)" icon="track_changes" />
              <Metric title="Inventario activo" value={`${formatMoney(stats.activeSaleUSD, 'USD')} + ${formatMoney(stats.activeRentPEN, 'PEN')}`} sub="Venta (USD) + Alquiler (S/)" icon="home_work" />
              <Metric title="Tareas vencidas" value={`${stats.overdueTasks}`} sub="Pendientes con fecha pasada" icon="assignment_late" />
              <Metric title="Visitas semanales" value={`${stats.visitsWeek}`} sub="Programadas (hoy → +7 días)" icon="event" />
            </div>
          </div>

          <div className="xl:col-span-4 rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/65 dark:bg-surface-dark/40 backdrop-blur-md shadow-elev-1 overflow-hidden relative">
            <div className="pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-primary to-indigo-500" />
            <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Atajos</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Accede rápido a módulos clave.</p>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
              <Shortcut href="/inventory" icon="home_work" title="Inventario" subtitle="Propiedades en venta/alquiler" />
              <Shortcut href="/kanban" icon="view_kanban" title="Leads" subtitle="Pipeline y seguimiento" />
              <Shortcut href="/calendar" icon="event" title="Agenda" subtitle="Visitas y calendario" />
              <Shortcut href="/tasks" icon="task" title="Tareas" subtitle="Operación diaria" />
              <Shortcut href="/gold-list" icon="stars" title="Gold List" subtitle="Clientes con presupuesto confirmado" />
              <Shortcut href="/reports" icon="bar_chart" title="Reportes" subtitle="KPIs y performance" />
            </div>
          </div>
        </section>

        {/* Activity */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
          <div className="xl:col-span-5 rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/65 dark:bg-surface-dark/40 backdrop-blur-md shadow-elev-1 overflow-hidden relative">
            <div className="pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
            <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Próximas visitas</p>
              <Link href="/calendar" className="text-xs text-primary hover:underline">
                Ver agenda
              </Link>
            </div>

            <div className="p-4 space-y-2">
              {nextVisits.map((v) => (
                <div
                  key={v.id}
                  className="rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/20 p-3 shadow-sm hover:shadow-elev-1 hover:-translate-y-[1px] transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      Lead {v.lead_id.substring(0, 6)}
                      {v.property_id ? ` · Prop ${v.property_id.substring(0, 6)}` : ''}
                    </p>
                    <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                      {formatDateShort(v.scheduled_for)} · {formatTimeShort(v.scheduled_for)}
                    </span>
                  </div>
                  {v.notes && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">{v.notes}</p>}
                </div>
              ))}

              {!nextVisits.length && !loading && (
                <div className="rounded-2xl border border-dashed border-slate-300/70 dark:border-slate-700/60 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  No hay visitas programadas.
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-4 rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/65 dark:bg-surface-dark/40 backdrop-blur-md shadow-elev-1 overflow-hidden relative">
            <div className="pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Tareas próximas</p>
              <Link href="/tasks" className="text-xs text-primary hover:underline">
                Ver tareas
              </Link>
            </div>

            <div className="p-4 space-y-2">
              {nextTasks.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/20 p-3 shadow-sm hover:shadow-elev-1 hover:-translate-y-[1px] transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{t.title}</p>
                    <span
                      className={[
                        'text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap',
                        t.isOverdue
                          ? 'bg-rose-50 text-rose-700 border-rose-200/60'
                          : t.isToday
                            ? 'bg-amber-50 text-amber-800 border-amber-200/60'
                            : 'bg-slate-50 text-slate-700 border-slate-200/60',
                      ].join(' ')}
                    >
                      {t.due_date ? formatDateShort(t.due_date) : 'Sin fecha'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t.related_type && t.related_id ? (t.related_type === 'lead' ? 'Lead' : 'Propiedad') : 'Sin vínculo'}{' '}
                    {t.related_id ? `· ${t.related_id.substring(0, 6)}` : ''}
                  </p>
                </div>
              ))}

              {!nextTasks.length && !loading && (
                <div className="rounded-2xl border border-dashed border-slate-300/70 dark:border-slate-700/60 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  No hay tareas pendientes.
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-3 rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/65 dark:bg-surface-dark/40 backdrop-blur-md shadow-elev-1 overflow-hidden relative">
            <div className="pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-primary to-blue-500" />
            <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Leads recientes</p>
              <Link href="/kanban" className="text-xs text-primary hover:underline">
                Ver pipeline
              </Link>
            </div>

            <div className="p-4 space-y-2">
              {latestLeads.map((l) => (
                <div
                  key={l.id}
                  className="rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/20 p-3 shadow-sm hover:shadow-elev-1 hover:-translate-y-[1px] transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{l.name}</p>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                      {l.stage}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {l.location || '—'}
                    {l.source ? ` · ${l.source}` : ''}
                  </p>
                </div>
              ))}

              {!latestLeads.length && !loading && (
                <div className="rounded-2xl border border-dashed border-slate-300/70 dark:border-slate-700/60 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Aún no hay leads.
                </div>
              )}
            </div>
          </div>
        </section>

        {loading && (
          <div className="fixed bottom-4 right-4 rounded-2xl px-4 py-3 shadow-elev-2 border border-white/70 dark:border-slate-700/60 bg-white/80 dark:bg-surface-dark/70 backdrop-blur-md">
            <div className="text-xs text-slate-600 dark:text-slate-300">Cargando dashboard…</div>
          </div>
        )}
      </main>

      {/* Modal: Nuevo (se mantiene, solo look premium) */}
      {openNew && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={() => setOpenNew(false)} />
          <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
            <div
              className="w-full max-w-3xl rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-surface-dark shadow-elev-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Crear nuevo</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Modo demo (local-first). No cambia estructura.</p>
                </div>
                <button
                  onClick={() => setOpenNew(false)}
                  className="h-9 w-9 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/20 hover:bg-white/80 dark:hover:bg-slate-900/30 transition-colors flex items-center justify-center"
                  aria-label="Cerrar"
                >
                  <span className="material-icons text-slate-500">close</span>
                </button>
              </div>

              <div className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  <Pill active={newKind === 'lead'} onClick={() => resetModal('lead')} icon="person_add" label="Lead" />
                  <Pill active={newKind === 'property'} onClick={() => resetModal('property')} icon="home_work" label="Propiedad" />
                  <Pill active={newKind === 'visit'} onClick={() => resetModal('visit')} icon="event" label="Visita" />
                  <Pill active={newKind === 'task'} onClick={() => resetModal('task')} icon="task_alt" label="Tarea" />
                </div>

                {/* Forms */}
                <div className="mt-4">
                  {newKind === 'lead' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Nombre *">
                        <input
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={leadForm.name}
                          onChange={(e) => setLeadForm((s) => ({ ...s, name: e.target.value }))}
                          placeholder="Ej. Ana Torres"
                        />
                      </Field>

                      <Field label="Teléfono">
                        <input
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={leadForm.phone}
                          onChange={(e) => setLeadForm((s) => ({ ...s, phone: e.target.value }))}
                          placeholder="+51 9xx xxx xxx"
                        />
                      </Field>

                      <Field label="Email">
                        <input
                          type="email"
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={leadForm.email}
                          onChange={(e) => setLeadForm((s) => ({ ...s, email: e.target.value }))}
                          placeholder="correo@ejemplo.com"
                        />
                      </Field>

                      <Field label="Etapa">
                        <select
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={leadForm.stage}
                          onChange={(e) => setLeadForm((s) => ({ ...s, stage: e.target.value as LeadStage }))}
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Fuente">
                        <input
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={leadForm.source}
                          onChange={(e) => setLeadForm((s) => ({ ...s, source: e.target.value }))}
                          placeholder="Facebook / Referido / WhatsApp…"
                        />
                      </Field>

                      <Field label="Zona / Ubicación">
                        <input
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={leadForm.location}
                          onChange={(e) => setLeadForm((s) => ({ ...s, location: e.target.value }))}
                          placeholder="Iquitos - San Juan"
                        />
                      </Field>

                      <Field label="Presupuesto mín. (número)">
                        <input
                          inputMode="numeric"
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={leadForm.budget_min}
                          onChange={(e) => setLeadForm((s) => ({ ...s, budget_min: e.target.value.replace(/[^0-9]/g, '') }))}
                          placeholder="Ej. 1500"
                        />
                      </Field>

                      <Field label="Presupuesto máx. (número)">
                        <input
                          inputMode="numeric"
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={leadForm.budget_max}
                          onChange={(e) => setLeadForm((s) => ({ ...s, budget_max: e.target.value.replace(/[^0-9]/g, '') }))}
                          placeholder="Ej. 2000"
                        />
                      </Field>
                    </div>
                  )}

                  {newKind === 'property' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Título *">
                        <input
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={propertyForm.title}
                          onChange={(e) => setPropertyForm((s) => ({ ...s, title: e.target.value }))}
                          placeholder="Ej. Casa moderna con piscina"
                        />
                      </Field>

                      <Field label="Operación">
                        <select
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={propertyForm.operation}
                          onChange={(e) => setPropertyForm((s) => ({ ...s, operation: e.target.value as any }))}
                        >
                          <option value="sale">Venta (USD)</option>
                          <option value="rent">Alquiler (S/)</option>
                        </select>
                      </Field>

                      {propertyForm.operation === 'sale' ? (
                        <Field label="Precio venta (USD)">
                          <input
                            inputMode="numeric"
                            className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            value={propertyForm.price_sale}
                            onChange={(e) => setPropertyForm((s) => ({ ...s, price_sale: e.target.value.replace(/[^0-9]/g, '') }))}
                            placeholder="Ej. 180000"
                          />
                        </Field>
                      ) : (
                        <Field label="Precio alquiler (S/)">
                          <input
                            inputMode="numeric"
                            className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            value={propertyForm.price_rent}
                            onChange={(e) => setPropertyForm((s) => ({ ...s, price_rent: e.target.value.replace(/[^0-9]/g, '') }))}
                            placeholder="Ej. 1600"
                          />
                        </Field>
                      )}

                      <Field label="Zona / Ubicación">
                        <input
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={propertyForm.location}
                          onChange={(e) => setPropertyForm((s) => ({ ...s, location: e.target.value }))}
                          placeholder="Urbanización Miami"
                        />
                      </Field>

                      <Field label="Tipo">
                        <input
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={propertyForm.property_type}
                          onChange={(e) => setPropertyForm((s) => ({ ...s, property_type: e.target.value }))}
                          placeholder="Casa / Departamento / Terreno…"
                        />
                      </Field>

                      <Field label="Dormitorios">
                        <input
                          inputMode="numeric"
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={propertyForm.bedrooms}
                          onChange={(e) => setPropertyForm((s) => ({ ...s, bedrooms: e.target.value.replace(/[^0-9]/g, '') }))}
                          placeholder="3"
                        />
                      </Field>

                      <Field label="Baños">
                        <input
                          inputMode="numeric"
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={propertyForm.bathrooms}
                          onChange={(e) => setPropertyForm((s) => ({ ...s, bathrooms: e.target.value.replace(/[^0-9]/g, '') }))}
                          placeholder="2"
                        />
                      </Field>

                      <Field label="Área (m²)">
                        <input
                          inputMode="numeric"
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={propertyForm.area_sqm}
                          onChange={(e) => setPropertyForm((s) => ({ ...s, area_sqm: e.target.value.replace(/[^0-9]/g, '') }))}
                          placeholder="220"
                        />
                      </Field>

                      <Field label="Dirección">
                        <input
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={propertyForm.address}
                          onChange={(e) => setPropertyForm((s) => ({ ...s, address: e.target.value }))}
                          placeholder="Iquitos, Loreto"
                        />
                      </Field>

                      <div className="sm:col-span-2">
                        <Field label="Descripción (opcional)">
                          <textarea
                            className="min-h-[96px] w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            value={propertyForm.description}
                            onChange={(e) => setPropertyForm((s) => ({ ...s, description: e.target.value }))}
                            placeholder="Breve descripción para el inventario…"
                          />
                        </Field>
                      </div>

                      <div className="sm:col-span-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/40 dark:bg-slate-900/20 p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Vista previa:{' '}
                          <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                            {propertyForm.operation === 'sale'
                              ? formatMoney(propertyForm.price_sale ? Number(propertyForm.price_sale) : null, 'USD')
                              : formatMoney(propertyForm.price_rent ? Number(propertyForm.price_rent) : null, 'PEN')}
                            {' · '}
                            {propertyForm.location || '—'}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}

                  {newKind === 'visit' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Lead *">
                        <select
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={visitForm.lead_id}
                          onChange={(e) => setVisitForm((s) => ({ ...s, lead_id: e.target.value }))}
                        >
                          <option value="">— Seleccionar —</option>
                          {leads
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name}
                                {l.phone ? ` · ${l.phone}` : ''}
                              </option>
                            ))}
                        </select>
                      </Field>

                      <Field label="Propiedad (opcional)">
                        <select
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={visitForm.property_id}
                          onChange={(e) => setVisitForm((s) => ({ ...s, property_id: e.target.value }))}
                        >
                          <option value="">— Sin propiedad —</option>
                          {properties.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}
                              {p.location ? ` · ${p.location}` : ''}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Fecha y hora *">
                        <input
                          type="datetime-local"
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={visitForm.scheduled_for}
                          onChange={(e) => setVisitForm((s) => ({ ...s, scheduled_for: e.target.value }))}
                        />
                      </Field>

                      <Field label="Notas (opcional)">
                        <input
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={visitForm.notes}
                          onChange={(e) => setVisitForm((s) => ({ ...s, notes: e.target.value }))}
                          placeholder="Ej. Confirmar 1h antes"
                        />
                      </Field>
                    </div>
                  )}

                  {newKind === 'task' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Título *">
                        <input
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm((s) => ({ ...s, title: e.target.value }))}
                          placeholder="Ej. Llamar para confirmar visita"
                        />
                      </Field>

                      <Field label="Vence (fecha)">
                        <input
                          type="date"
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={taskForm.due_date}
                          onChange={(e) => setTaskForm((s) => ({ ...s, due_date: e.target.value }))}
                        />
                      </Field>

                      <Field label="Vincular a">
                        <select
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={taskForm.related_type}
                          onChange={(e) =>
                            setTaskForm((s) => ({
                              ...s,
                              related_type: e.target.value as any,
                              related_id: '',
                            }))
                          }
                        >
                          <option value="none">Sin vínculo</option>
                          <option value="lead">Lead</option>
                          <option value="deal">Propiedad</option>
                        </select>
                      </Field>

                      <Field label="Elemento (opcional)">
                        <select
                          className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          value={taskForm.related_id}
                          onChange={(e) => setTaskForm((s) => ({ ...s, related_id: e.target.value }))}
                          disabled={taskForm.related_type === 'none'}
                        >
                          <option value="">— Seleccionar —</option>
                          {taskForm.related_type === 'lead' &&
                            leads
                              .slice()
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.name}
                                  {l.phone ? ` · ${l.phone}` : ''}
                                </option>
                              ))}
                          {taskForm.related_type === 'deal' &&
                            properties.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.title}
                                {p.location ? ` · ${p.location}` : ''}
                              </option>
                            ))}
                        </select>
                      </Field>

                      <div className="sm:col-span-2">
                        <Field label="Notas (opcional)">
                          <textarea
                            className="min-h-[96px] w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                            value={taskForm.notes}
                            onChange={(e) => setTaskForm((s) => ({ ...s, notes: e.target.value }))}
                            placeholder="Ej. Cliente confirmó presupuesto. Enviar 3 opciones."
                          />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <Button variant="secondary" onClick={() => setOpenNew(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={creating || modalPrimaryDisabled}>
                  <span className="material-icons text-[18px]">save</span>
                  {creating ? 'Guardando…' : 'Guardar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== UI helpers (Aurora Premium styles) ===== */

function KpiCard({
  icon,
  label,
  value,
  badge,
  tone,
}: {
  icon: string;
  label: string;
  value: number;
  badge: string;
  tone?: 'danger' | 'info' | 'success';
}) {
  const rail =
    tone === 'danger'
      ? 'from-rose-500 to-pink-500'
      : tone === 'info'
        ? 'from-violet-500 to-indigo-500'
        : tone === 'success'
          ? 'from-emerald-500 to-teal-500'
          : 'from-primary to-indigo-500';

  const chip =
    tone === 'danger'
      ? 'bg-rose-50 text-rose-700 border-rose-200/60'
      : tone === 'info'
        ? 'bg-violet-50 text-violet-700 border-violet-200/60'
        : tone === 'success'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
          : 'bg-primary/10 text-primary border-primary/20';

  const iconBox =
    tone === 'danger'
      ? 'bg-rose-50 text-rose-700 ring-rose-200/60'
      : tone === 'info'
        ? 'bg-violet-50 text-violet-700 ring-violet-200/60'
        : tone === 'success'
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60'
          : 'bg-primary/10 text-primary ring-primary/20';

  return (
    <div className="rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/65 dark:bg-surface-dark/40 backdrop-blur-md shadow-elev-1 overflow-hidden relative">
      <div className={`pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${rail}`} />
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
          <span className={`mt-2 inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full border ${chip}`}>
            {badge}
          </span>
        </div>

        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ring-1 shrink-0 ${iconBox}`}>
          <span className="material-icons text-[20px]">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value, sub, icon }: { title: string; value: string; sub: string; icon: string }) {
  const rail =
    icon === 'assignment_late'
      ? 'from-rose-500 to-pink-500'
      : icon === 'event'
        ? 'from-teal-500 to-emerald-500'
        : icon === 'home_work'
          ? 'from-violet-500 to-indigo-500'
          : 'from-primary to-indigo-500';

  const iconBox =
    icon === 'assignment_late'
      ? 'bg-rose-50 text-rose-700 ring-rose-200/60'
      : icon === 'event'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60'
        : icon === 'home_work'
          ? 'bg-violet-50 text-violet-700 ring-violet-200/60'
          : 'bg-primary/10 text-primary ring-primary/20';

  return (
    <div className="rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/20 p-4 shadow-sm hover:shadow-elev-1 hover:-translate-y-[1px] transition-all relative overflow-hidden">
      <div className={`pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${rail}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>
        </div>
        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ring-1 shrink-0 ${iconBox}`}>
          <span className="material-icons text-[20px]">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function Shortcut({ href, icon, title, subtitle }: { href: string; icon: string; title: string; subtitle: string }) {
  const rail =
    icon === 'stars'
      ? 'from-amber-500 to-orange-500'
      : icon === 'view_kanban'
        ? 'from-violet-500 to-fuchsia-500'
        : icon === 'event'
          ? 'from-teal-500 to-emerald-500'
          : icon === 'task'
            ? 'from-rose-500 to-pink-500'
            : icon === 'bar_chart'
              ? 'from-slate-500 to-slate-700'
              : 'from-primary to-indigo-500';

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/20 p-3 shadow-sm hover:shadow-elev-1 hover:-translate-y-[1px] transition-all relative overflow-hidden"
    >
      <div className={`pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${rail}`} />
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl text-white bg-gradient-to-tr from-primary via-blue-500 to-indigo-500 shadow-elev-1 ring-1 ring-white/20 flex items-center justify-center">
          <span className="material-icons text-[20px]">{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
        </div>
        <span className="ml-auto material-icons text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors">
          chevron_right
        </span>
      </div>
    </Link>
  );
}

function Pill({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={[
        'h-10 px-3 rounded-2xl border text-sm font-semibold inline-flex items-center gap-2 transition-colors',
        active
          ? 'bg-primary/10 text-primary border-primary/20'
          : 'bg-white/60 dark:bg-slate-900/20 text-slate-700 dark:text-slate-200 border-slate-200/60 dark:border-slate-700/60 hover:bg-white/80 dark:hover:bg-slate-900/30',
      ].join(' ')}
      type="button"
    >
      <span className="material-icons text-[18px]">{icon}</span>
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</div>
      {children}
    </label>
  );
}
