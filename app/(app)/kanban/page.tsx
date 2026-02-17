'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Lead, LeadStage, Property, Visit } from '@/types';
import { Button } from '@/components/ui/button';
import { formatBudgetRange, formatDateShort, formatTimeShort } from '@/lib/utils';

const STAGES: LeadStage[] = ['Nuevo', 'Contactado', 'Visita', 'Calificado', 'Oferta', 'Cierre', 'Perdido'];

function isLeadRotting(lead: Lead) {
  // “rotting”: más de 48h sin contacto o nunca contactado (y no está cerrado/perdido)
  if (lead.stage === 'Perdido' || lead.stage === 'Cierre') return false;
  if (!lead.last_contacted_at) return true;
  const diffH = (Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60);
  return diffH >= 48;
}

function rottingLabel(lead: Lead) {
  if (lead.stage === 'Perdido' || lead.stage === 'Cierre') return null;
  if (!lead.last_contacted_at) return 'Sin contacto';
  const diffH = (Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60);
  if (diffH >= 72) return '+72h inactivo';
  if (diffH >= 48) return '+48h inactivo';
  if (diffH >= 24) return '+24h sin contacto';
  return null;
}

export default function KanbanPage() {
  const supabase = createClient();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [openNewLead, setOpenNewLead] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);

  const [openSchedule, setOpenSchedule] = useState(false);
  const [scheduleLeadId, setScheduleLeadId] = useState<string | null>(null);
  const [creatingVisit, setCreatingVisit] = useState(false);

  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'Facebook',
    stage: 'Nuevo' as LeadStage,
    budget_min: '',
    budget_max: '',
    location: '',
  });

  const [visitForm, setVisitForm] = useState({
    date: '',
    time: '',
    property_id: '',
    notes: '',
  });

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: l }, { data: p }] = await Promise.all([
      supabase.from('leads').select('*'),
      supabase.from('properties').select('*'),
    ]);
    setLeads((l as Lead[]) || []);
    setProperties((p as Property[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLeads = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return leads;
    return leads.filter((l) => {
      const hay = [
        l.name,
        l.phone || '',
        l.email || '',
        l.location || '',
        l.source || '',
        l.stage || '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(s);
    });
  }, [leads, q]);

  const countsByStage = useMemo(() => {
    const out: Record<LeadStage, number> = {
      Nuevo: 0,
      Contactado: 0,
      Calificado: 0,
      Visita: 0,
      Oferta: 0,
      Cierre: 0,
      Perdido: 0,
    };
    for (const l of filteredLeads) out[l.stage] = (out[l.stage] || 0) + 1;
    return out;
  }, [filteredLeads]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = async (e: React.DragEvent, stage: LeadStage) => {
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    // Optimistic update
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage } : l)));

    // DB Update
    await supabase.from('leads').update({ stage }).eq('id', leadId);

    // Si pasa a Visita, abre modal para agendar (funcional)
    if (stage === 'Visita') {
      setScheduleLeadId(leadId);
      // sugerir fecha/hora por defecto (hoy + 1h)
      const now = new Date();
      const date = now.toISOString().slice(0, 10);
      const time = new Date(now.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);
      setVisitForm({ date, time, property_id: '', notes: '' });
      setOpenSchedule(true);
    }
  };

  async function handleCreateLead() {
    if (!leadForm.name.trim()) return;

    setCreatingLead(true);
    try {
      const payload: Partial<Lead> = {
        org_id: 'org_demo',
        name: leadForm.name.trim(),
        phone: leadForm.phone.trim() || null,
        email: leadForm.email.trim() || null,
        source: leadForm.source || null,
        stage: leadForm.stage,
        budget_min: leadForm.budget_min ? Number(leadForm.budget_min) : null,
        budget_max: leadForm.budget_max ? Number(leadForm.budget_max) : null,
        location: leadForm.location.trim() || null,
        assigned_to: null,
        last_contacted_at: null,
      };

      const { data } = await supabase.from('leads').insert(payload as any);
      if (data && Array.isArray(data)) setLeads((prev) => [data[0] as Lead, ...prev]);
      else await fetchAll();

      setOpenNewLead(false);
      setLeadForm({
        name: '',
        phone: '',
        email: '',
        source: 'Facebook',
        stage: 'Nuevo',
        budget_min: '',
        budget_max: '',
        location: '',
      });
    } finally {
      setCreatingLead(false);
    }
  }

  async function handleMarkContacted(lead: Lead) {
    const nowISO = new Date().toISOString();
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, last_contacted_at: nowISO } : l)));
    await supabase.from('leads').update({ last_contacted_at: nowISO, stage: lead.stage === 'Nuevo' ? 'Contactado' : lead.stage }).eq('id', lead.id);
  }

  async function handleCreateVisit() {
    if (!scheduleLeadId) return;
    if (!visitForm.date || !visitForm.time) return;

    setCreatingVisit(true);
    try {
      const scheduled_for = new Date(`${visitForm.date}T${visitForm.time}:00`).toISOString();
      const payload: Partial<Visit> = {
        org_id: 'org_demo',
        lead_id: scheduleLeadId,
        property_id: visitForm.property_id || null,
        scheduled_for,
        status: 'programada',
        notes: visitForm.notes.trim() || null,
      };

      await supabase.from('visits').insert(payload as any);

      setOpenSchedule(false);
      setScheduleLeadId(null);
      setVisitForm({ date: '', time: '', property_id: '', notes: '' });
    } finally {
      setCreatingVisit(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Controls (sin header; AppTopbar es global en app/(app)/layout.tsx) */}
      <div className="px-6 md:px-8 pt-6 md:pt-8 flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-primary/12 p-2 rounded-xl text-primary ring-1 ring-primary/10">
              <span className="material-icons">view_kanban</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight truncate">
                Pipeline de Leads
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Arrastra tarjetas entre etapas. Rotting te ayuda a priorizar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end flex-wrap">
            <div className="hidden md:flex items-center gap-2 rounded-2xl border border-white/70 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/20 px-3 h-10 shadow-elev-1 backdrop-blur-md">
              <span className="material-icons text-slate-400 text-[18px]">search</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="bg-transparent outline-none text-sm w-56 placeholder:text-slate-400 text-slate-800 dark:text-slate-100"
                placeholder="Buscar lead, zona, teléfono…"
              />
            </div>

            <Button variant="outline" className="h-10" onClick={fetchAll}>
              <span className="material-icons text-[18px]">refresh</span>
              Actualizar
            </Button>

            <Button className="h-10" onClick={() => setOpenNewLead(true)}>
              <span className="material-icons text-[18px]">add</span>
              Nuevo Lead
            </Button>
          </div>
        </div>
      </div>


      {/* Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 md:px-8 pb-6 md:pb-8 pt-4">
        <div className="flex h-full gap-5 min-w-max">
          {STAGES.map((stage) => (
            <div
              key={stage}
              className="w-80 flex flex-col h-full rounded-2xl glass shadow-elev-1"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{stage}</span>
                  {stage === 'Visita' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      agendar
                    </span>
                  )}
                  {stage === 'Cierre' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      éxito
                    </span>
                  )}
                </div>

                <span className="bg-slate-900/5 dark:bg-white/10 text-xs font-bold px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-200 tabular-nums">
                  {countsByStage[stage] || 0}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 p-3 scrollbar-hide">
                {filteredLeads
                  .filter((l) => l.stage === stage)
                  .sort((a, b) => {
                    // rotting primero dentro de columna
                    const ar = isLeadRotting(a) ? 1 : 0;
                    const br = isLeadRotting(b) ? 1 : 0;
                    return br - ar;
                  })
                  .map((lead) => {
                    const rot = rottingLabel(lead);
                    const rotting = isLeadRotting(lead);
                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        className={[
                          'bg-white/70 dark:bg-slate-900/20 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60',
                          'shadow-sm hover:shadow-elev-1 transition-all duration-150 cursor-grab active:cursor-grabbing',
                          'group relative overflow-hidden',
                          rotting ? 'ring-1 ring-red-200/70 rotting-pulse' : '',
                        ].join(' ')}
                      >
                        {/* Stage color bar */}
                        <div
                          className={[
                            'absolute left-0 top-0 bottom-0 w-[4px]',
                            stage === 'Cierre'
                              ? 'bg-emerald-500/80'
                              : stage === 'Oferta'
                              ? 'bg-indigo-500/75'
                              : stage === 'Perdido'
                              ? 'bg-slate-400/70'
                              : 'bg-primary/80',
                          ].join(' ')}
                        />

                        <div className="flex justify-between items-start mb-2 gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                              {lead.name}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {lead.source || '—'} · {lead.location || '—'}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              title="Marcar como contactado"
                              onClick={() => handleMarkContacted(lead)}
                              className="text-slate-500 hover:text-primary hover:bg-primary/10 p-1 rounded-xl transition-colors"
                            >
                              <span className="material-icons text-[18px]">done</span>
                            </button>
                            <button
                              title="Chat & notas (sin lógica por ahora)"
                              onClick={() => {}}
                              className="text-slate-400 hover:text-slate-600 hover:bg-white/70 dark:hover:bg-slate-800/50 p-1 rounded-xl transition-colors"
                            >
                              <span className="material-icons text-[18px]">chat</span>
                            </button>
                          </div>
                        </div>

                        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                          <div className="flex items-center gap-1 tabular-nums">
                            <span className="material-icons text-[14px] text-slate-400">payments</span>
                            {formatBudgetRange(lead.budget_min, lead.budget_max)}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="material-icons text-[14px] text-slate-400">call</span>
                            <span className="truncate">{lead.phone || '—'}</span>
                          </div>
                        </div>

                        {rot && (
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200/60 px-2 py-0.5 rounded-full">
                              {rot}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {lead.last_contacted_at ? `Último: ${formatDateShort(lead.last_contacted_at)}` : 'Priorizar contacto'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {!countsByStage[stage] && (
                  <div className="rounded-2xl border border-dashed border-slate-300/70 dark:border-slate-700/60 p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    Arrastra leads aquí o crea uno nuevo.
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-slate-200/60 dark:border-slate-700/60">
                <Link
                  href="/dashboard"
                  className="text-xs font-medium text-primary hover:underline underline-offset-4"
                >
                  Ver resumen →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Nuevo Lead */}
      {openNewLead && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={() => setOpenNewLead(false)} />
          <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
            <div
              className="w-full max-w-2xl rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-surface-dark shadow-elev-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Nuevo Lead</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Se guardará localmente (modo demo). Luego lo conectamos a Supabase real.
                </p>
              </div>

              <div className="px-5 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nombre *">
                    <input
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={leadForm.name}
                      onChange={(e) => setLeadForm((s) => ({ ...s, name: e.target.value }))}
                      placeholder="Ej. Juan Pérez"
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
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={leadForm.email}
                      onChange={(e) => setLeadForm((s) => ({ ...s, email: e.target.value }))}
                      placeholder="correo@dominio.com"
                    />
                  </Field>

                  <Field label="Fuente">
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={leadForm.source}
                      onChange={(e) => setLeadForm((s) => ({ ...s, source: e.target.value }))}
                    >
                      {['Facebook', 'WhatsApp', 'Referido', 'Instagram', 'Web', 'Otro'].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
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

                  <Field label="Ubicación / Zona">
                    <input
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={leadForm.location}
                      onChange={(e) => setLeadForm((s) => ({ ...s, location: e.target.value }))}
                      placeholder="Ej. Iquitos - Punchana"
                    />
                  </Field>

                  <Field label="Presupuesto mín.">
                    <input
                      inputMode="numeric"
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={leadForm.budget_min}
                      onChange={(e) =>
                        setLeadForm((s) => ({ ...s, budget_min: e.target.value.replace(/[^0-9]/g, '') }))
                      }
                      placeholder="Ej. 1500"
                    />
                  </Field>

                  <Field label="Presupuesto máx.">
                    <input
                      inputMode="numeric"
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={leadForm.budget_max}
                      onChange={(e) =>
                        setLeadForm((s) => ({ ...s, budget_max: e.target.value.replace(/[^0-9]/g, '') }))
                      }
                      placeholder="Ej. 2000"
                    />
                  </Field>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/40 dark:bg-slate-900/20 p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Presupuesto:{" "}
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatBudgetRange(
                        leadForm.budget_min ? Number(leadForm.budget_min) : null,
                        leadForm.budget_max ? Number(leadForm.budget_max) : null
                      )}
                    </span>
                  </p>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <Button variant="secondary" onClick={() => setOpenNewLead(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateLead} disabled={creatingLead || !leadForm.name.trim()}>
                  <span className="material-icons text-[18px]">save</span>
                  {creatingLead ? 'Guardando…' : 'Guardar Lead'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agendar visita (cuando un lead se mueve a “Visita”) */}
      {openSchedule && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={() => setOpenSchedule(false)} />
          <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
            <div
              className="w-full max-w-2xl rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-surface-dark shadow-elev-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Agendar visita</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Se creará una visita programada para el lead seleccionado.
                </p>
              </div>

              <div className="px-5 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Fecha">
                    <input
                      type="date"
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={visitForm.date}
                      onChange={(e) => setVisitForm((s) => ({ ...s, date: e.target.value }))}
                    />
                  </Field>
                  <Field label="Hora">
                    <input
                      type="time"
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={visitForm.time}
                      onChange={(e) => setVisitForm((s) => ({ ...s, time: e.target.value }))}
                    />
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
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Notas (opcional)">
                    <textarea
                      className="min-h-[96px] w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={visitForm.notes}
                      onChange={(e) => setVisitForm((s) => ({ ...s, notes: e.target.value }))}
                      placeholder="Ej. Confirmar con el cliente 1h antes…"
                    />
                  </Field>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/40 dark:bg-slate-900/20 p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Vista previa:{" "}
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {visitForm.date && visitForm.time
                        ? `${visitForm.date} · ${visitForm.time}`
                        : '—'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <Button variant="secondary" onClick={() => setOpenSchedule(false)}>
                  Ahora no
                </Button>
                <Button onClick={handleCreateVisit} disabled={creatingVisit || !visitForm.date || !visitForm.time}>
                  <span className="material-icons text-[18px]">event</span>
                  {creatingVisit ? 'Agendando…' : 'Agendar visita'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed bottom-4 right-4 glass rounded-2xl px-4 py-3 shadow-elev-2 border border-slate-200/60 dark:border-slate-700/60">
          <div className="text-xs text-slate-600 dark:text-slate-300">Cargando leads…</div>
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
