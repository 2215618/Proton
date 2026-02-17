'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Lead, Property, Task } from '@/types';
import { Button } from '@/components/ui/button';
import { formatDateShort } from '@/lib/utils';

type Section = 'Overdue' | 'Today' | 'Upcoming';
type RelType = 'lead' | 'deal' | 'none';

function ymdLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDue(due: string | null) {
  if (!due) return null;
  const dt = new Date(due.length === 10 ? `${due}T00:00:00` : due);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function sectionForTask(task: Task): Section {
  const d = parseDue(task.due_date ?? null);
  if (!d) return 'Upcoming';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(d);
  due.setHours(0, 0, 0, 0);

  if (due.getTime() < today.getTime()) return 'Overdue';
  if (due.getTime() === today.getTime()) return 'Today';
  return 'Upcoming';
}

function sectionTitle(sec: Section) {
  if (sec === 'Overdue') return 'Vencidas';
  if (sec === 'Today') return 'Hoy';
  return 'Próximas';
}

function sectionTone(sec: Section) {
  if (sec === 'Overdue') return 'text-rose-600 dark:text-rose-400';
  if (sec === 'Today') return 'text-amber-700 dark:text-amber-300';
  return 'text-slate-600 dark:text-slate-300';
}

function statusBadge(status: Task['status']) {
  return status === 'completed'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
    : 'bg-slate-50 text-slate-700 border-slate-200/60';
}

export default function TasksPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  const [q, setQ] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(true);

  const [openNew, setOpenNew] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    title: '',
    due_date: '',
    related_type: 'none' as RelType,
    related_id: '',
    notes: '',
  });

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: t }, { data: l }, { data: p }] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('leads').select('*'),
      supabase.from('properties').select('*'),
    ]);

    setTasks((t as Task[]) || []);
    setLeads((l as Lead[]) || []);
    setProperties((p as Property[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return tasks
      .filter((t) => (onlyOpen ? t.status !== 'completed' : true))
      .filter((t) => {
        if (!s) return true;
        const hay = [t.title, (t as any).notes || '', t.status, t.related_type || '', t.related_id || '', t.due_date || '']
          .join(' ')
          .toLowerCase();
        return hay.includes(s);
      })
      .sort((a, b) => {
        const da = parseDue(a.due_date ?? null)?.getTime() ?? Infinity;
        const db = parseDue(b.due_date ?? null)?.getTime() ?? Infinity;
        if (da !== db) return da - db;
        return (a.created_at || '').localeCompare(b.created_at || '');
      });
  }, [tasks, q, onlyOpen]);

  const bySection = useMemo(() => {
    const out: Record<Section, Task[]> = { Overdue: [], Today: [], Upcoming: [] };
    for (const t of filtered) out[sectionForTask(t)].push(t);
    return out;
  }, [filtered]);

  const totals = useMemo(() => {
    const total = tasks.length;
    const open = tasks.filter((t) => t.status !== 'completed').length;
    const done = total - open;
    return { total, open, done };
  }, [tasks]);

  async function toggleDone(task: Task) {
    const nextStatus: Task['status'] = task.status === 'completed' ? 'pending' : 'completed';
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    await supabase.from('tasks').update({ status: nextStatus } as any).eq('id', task.id);
  }

  function openNewTask() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    setForm({
      title: '',
      due_date: ymdLocal(tomorrow),
      related_type: 'none',
      related_id: '',
      notes: '',
    });
    setOpenNew(true);
  }

  async function handleCreate() {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const payload: Partial<Task> & { notes?: string | null } = {
        org_id: 'org_demo',
        title: form.title.trim(),
        status: 'pending',
        due_date: form.due_date || null,
        related_type: form.related_type === 'none' ? null : form.related_type,
        related_id: form.related_type === 'none' ? null : (form.related_id || null),
        assignee_id: null,
        // notes existe en DB mock (aunque no esté en types)
        notes: form.notes.trim() || null,
      };

      const { data } = await supabase.from('tasks').insert(payload as any);
      if (data && Array.isArray(data)) setTasks((prev) => [data[0] as Task, ...prev]);
      else await fetchAll();

      setOpenNew(false);
    } finally {
      setCreating(false);
    }
  }

  const relatedLabel = useMemo(() => {
    if (form.related_type === 'lead') return 'Lead';
    if (form.related_type === 'deal') return 'Propiedad';
    return '';
  }, [form.related_type]);

  const relatedOptions = useMemo(() => {
    if (form.related_type === 'lead') {
      return leads
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((l) => ({ id: l.id, label: `${l.name}${l.phone ? ` · ${l.phone}` : ''}` }));
    }
    if (form.related_type === 'deal') {
      return properties.map((p) => ({ id: p.id, label: `${p.title}${p.location ? ` · ${p.location}` : ''}` }));
    }
    return [];
  }, [form.related_type, leads, properties]);

  function relText(t: Task) {
    if (!t.related_type || !t.related_id) return 'Sin vínculo';
    const short = t.related_id.substring(0, 6);
    return t.related_type === 'lead' ? `Lead · ${short}` : `Propiedad · ${short}`;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Controls (sin header; AppTopbar es global en app/(app)/layout.tsx) */}
      <div className="px-6 md:px-8 pt-6 md:pt-8 flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total: <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{totals.total}</span> ·
              Abiertas:{' '}
              <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{totals.open}</span> · Hechas:{' '}
              <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{totals.done}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <div className="hidden lg:flex items-center gap-2 rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/20 px-3 h-10 shadow-elev-1 backdrop-blur-md">
              <span className="material-icons text-slate-400 text-[18px]">search</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="bg-transparent outline-none text-sm w-64 placeholder:text-slate-400 text-slate-800 dark:text-slate-100"
                placeholder="Buscar tareas…"
              />
            </div>

            <button
              className={[
                'h-10 px-3 rounded-2xl border text-sm shadow-elev-1 transition-colors backdrop-blur-md',
                onlyOpen
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-white/70 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/20 text-slate-700 dark:text-slate-200',
              ].join(' ')}
              onClick={() => setOnlyOpen((v) => !v)}
              type="button"
            >
              {onlyOpen ? 'Solo abiertas' : 'Todas'}
            </button>

            <Button className="h-10" onClick={openNewTask}>
              <span className="material-icons text-[18px]">add</span>
              Nueva
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 md:pb-8 pt-4">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Sections */}
          <section className="xl:col-span-8 space-y-6">
            {(Object.keys(bySection) as Section[]).map((sec) => (
              <div
                key={sec}
                className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-1 overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between bg-white/35 dark:bg-slate-900/20">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold tracking-wider uppercase ${sectionTone(sec)}`}>
                      {sectionTitle(sec)}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-white/60 dark:bg-slate-900/20 border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 tabular-nums">
                      {bySection[sec].length}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {bySection[sec].map((task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 p-3 flex items-start gap-3 hover:shadow-elev-1 transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={() => toggleDone(task)}
                        className="mt-1.5 h-4 w-4 rounded accent-primary"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p
                            className={[
                              'text-sm font-semibold truncate',
                              task.status === 'completed'
                                ? 'text-slate-400 line-through'
                                : 'text-slate-900 dark:text-white',
                            ].join(' ')}
                          >
                            {task.title}
                          </p>
                          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                            {task.due_date ? formatDateShort(task.due_date) : '—'}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge(task.status)}`}>
                            {task.status === 'completed' ? 'Completada' : 'Pendiente'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/20">
                            {relText(task)}
                          </span>
                          {(task as any).notes && <span className="truncate">{(task as any).notes}</span>}
                        </div>
                      </div>
                    </div>
                  ))}

                  {!bySection[sec].length && !loading && (
                    <div className="rounded-2xl border border-dashed border-slate-300/70 dark:border-slate-700/60 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      No hay tareas en esta sección.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>

          {/* Right rail */}
          <aside className="xl:col-span-4 space-y-6">
            <div className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-1 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/35 dark:bg-slate-900/20">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Atajos</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Crear tareas rápidas para el equipo.</p>
              </div>

              <div className="p-4 space-y-3">
                <QuickRow
                  title="Llamar a lead"
                  subtitle="Hoy · seguimiento"
                  onClick={() => {
                    const today = new Date();
                    setForm((s) => ({
                      ...s,
                      title: 'Llamar a lead (seguimiento)',
                      due_date: ymdLocal(today),
                      related_type: 'lead',
                    }));
                    setOpenNew(true);
                  }}
                />
                <QuickRow
                  title="Confirmar visita"
                  subtitle="Mañana · recordar 1h antes"
                  onClick={() => {
                    const tmr = new Date();
                    tmr.setDate(tmr.getDate() + 1);
                    setForm((s) => ({
                      ...s,
                      title: 'Confirmar visita (1h antes)',
                      due_date: ymdLocal(tmr),
                      related_type: 'lead',
                    }));
                    setOpenNew(true);
                  }}
                />
                <QuickRow
                  title="Actualizar inventario"
                  subtitle="Esta semana"
                  onClick={() => {
                    const tmr = new Date();
                    tmr.setDate(tmr.getDate() + 3);
                    setForm((s) => ({
                      ...s,
                      title: 'Actualizar inventario de propiedades',
                      due_date: ymdLocal(tmr),
                      related_type: 'deal',
                    }));
                    setOpenNew(true);
                  }}
                />
              </div>
            </div>

            <div className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-1 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/35 dark:bg-slate-900/20 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Estado</p>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                  Demo local-first
                </span>
              </div>

              <div className="p-4 text-sm text-slate-700 dark:text-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Leads</span>
                  <span className="font-semibold tabular-nums">{leads.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Propiedades</span>
                  <span className="font-semibold tabular-nums">{properties.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tareas</span>
                  <span className="font-semibold tabular-nums">{tasks.length}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {loading && (
          <div className="fixed bottom-4 right-4 glass rounded-2xl px-4 py-3 shadow-elev-2 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs text-slate-600 dark:text-slate-300">Cargando tareas…</div>
          </div>
        )}
      </main>

      {/* Modal: New task */}
      {openNew && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={() => setOpenNew(false)} />
          <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
            <div
              className="w-full max-w-2xl rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-surface-dark shadow-elev-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Nueva tarea</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Se guardará en modo demo (sin Supabase real aún).
                </p>
              </div>

              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Título *">
                  <input
                    className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    value={form.title}
                    onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                    placeholder="Ej. Llamar a cliente para confirmar cita"
                  />
                </Field>

                <Field label="Vence (fecha)">
                  <input
                    type="date"
                    className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    value={form.due_date}
                    onChange={(e) => setForm((s) => ({ ...s, due_date: e.target.value }))}
                  />
                </Field>

                <Field label="Vincular a">
                  <select
                    className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    value={form.related_type}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        related_type: e.target.value as RelType,
                        related_id: '',
                      }))
                    }
                  >
                    <option value="none">Sin vínculo</option>
                    <option value="lead">Lead</option>
                    <option value="deal">Propiedad</option>
                  </select>
                </Field>

                <Field label={form.related_type === 'none' ? '—' : `${relatedLabel} (opcional)`}>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    value={form.related_id}
                    onChange={(e) => setForm((s) => ({ ...s, related_id: e.target.value }))}
                    disabled={form.related_type === 'none'}
                  >
                    <option value="">— Seleccionar —</option>
                    {relatedOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Notas (opcional)">
                  <textarea
                    className="min-h-[96px] w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    value={form.notes}
                    onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                    placeholder="Ej. Presupuesto confirmado. Enviar 3 opciones."
                  />
                </Field>

                <div className="sm:col-span-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/40 dark:bg-slate-900/20 p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Vista previa:{' '}
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {form.due_date ? formatDateShort(form.due_date) : 'Sin fecha'} ·{' '}
                      {form.related_type === 'none' ? 'Sin vínculo' : `${relatedLabel}${form.related_id ? ' asignado' : ''}`}
                    </span>
                  </p>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <Button variant="secondary" onClick={() => setOpenNew(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={creating || !form.title.trim()}>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</div>
      {children}
    </div>
  );
}

function QuickRow({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 p-3 hover:shadow-elev-1 transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        <span className="material-icons text-slate-400 text-[18px]">arrow_forward</span>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </button>
  );
}
