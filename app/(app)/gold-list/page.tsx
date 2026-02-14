'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Lead, Property, Visit } from '@/types';
import { Button } from '@/components/ui/button';
import { formatMoney, formatBudgetRange, formatDateShort, guessCurrencyFromBudget } from '@/lib/utils';

type Op = 'all' | 'sale' | 'rent';
type LeadOp = Exclude<Op, 'all'>;

const OVERRIDE_KEY = 'lg_crm_gold_op_overrides_v1';

function loadOverrides(): Record<string, LeadOp> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(OVERRIDE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, LeadOp>;
  } catch {
    return {};
  }
}

function saveOverrides(v: Record<string, LeadOp>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OVERRIDE_KEY, JSON.stringify(v));
  } catch {
    // ignore
  }
}

function deriveOpFromLead(lead: Lead): LeadOp {
  const c = guessCurrencyFromBudget(lead.budget_max ?? lead.budget_min ?? 0);
  return c === 'USD' ? 'sale' : 'rent';
}

function scoreLead(lead: Lead) {
  let score = 60;
  if (lead.phone) score += 6;
  if (lead.email) score += 4;
  if (lead.location) score += 4;

  if (lead.last_contacted_at) {
    const diffH = (Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60);
    if (diffH <= 24) score += 12;
    else if (diffH <= 48) score += 8;
    else if (diffH <= 72) score += 4;
  } else {
    score -= 6;
  }

  const b = lead.budget_max ?? lead.budget_min ?? 0;
  if (b > 10000) score += 10; // compra (USD)
  else if (b >= 1000) score += 8; // alquiler (PEN)
  else score += 4;

  if (lead.stage === 'Calificado') score += 5;

  return Math.max(35, Math.min(99, score));
}

function withinRange(value: number, min: number, max: number) {
  return value >= min && value <= max;
}

function formatLeadBudget(lead: Lead, op: LeadOp | null) {
  const min = lead.budget_min;
  const max = lead.budget_max;

  if (!min && !max) return '—';

  if (!op) return formatBudgetRange(min, max);

  const currency = op === 'sale' ? 'USD' : 'PEN';
  const a = min ?? 0;
  const b = max ?? 0;

  if (a && b && a !== b) return `${formatMoney(a, currency)} – ${formatMoney(b, currency)}`;
  return formatMoney(b || a, currency);
}

function opLabel(op: LeadOp) {
  return op === 'sale' ? 'Compra (USD)' : 'Alquiler (S/)';
}

function opPill(op: LeadOp) {
  return op === 'sale'
    ? 'bg-indigo-50 text-indigo-700 border-indigo-200/60'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
}

export default function GoldListPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [leadsGold, setLeadsGold] = useState<Lead[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  const [q, setQ] = useState('');
  const [opFilter, setOpFilter] = useState<Op>('all');

  const [openAdd, setOpenAdd] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const [openSuggest, setOpenSuggest] = useState(false);
  const [suggestLead, setSuggestLead] = useState<Lead | null>(null);

  const [openSchedule, setOpenSchedule] = useState(false);
  const [scheduleLeadId, setScheduleLeadId] = useState<string | null>(null);
  const [schedulePropertyId, setSchedulePropertyId] = useState<string | null>(null);
  const [creatingVisit, setCreatingVisit] = useState(false);
  const [visitForm, setVisitForm] = useState({ date: '', time: '', notes: '' });

  const [overrides, setOverrides] = useState<Record<string, LeadOp>>({});

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: l }, { data: p }] = await Promise.all([
      supabase.from('leads').select('*'),
      supabase.from('properties').select('*'),
    ]);

    const leadsAll = ((l as Lead[]) || []).slice();

    const gold = leadsAll
      .filter((x) => x.stage === 'Calificado')
      .sort((a, b) => (scoreLead(b) - scoreLead(a)) || (b.created_at.localeCompare(a.created_at)));

    setAllLeads(leadsAll);
    setLeadsGold(gold);
    setProperties((p as Property[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    setOverrides(loadOverrides());
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function leadOp(lead: Lead): LeadOp {
    return overrides[lead.id] || deriveOpFromLead(lead);
  }

  function setLeadOpOverride(leadId: string, op: LeadOp) {
    const next = { ...overrides, [leadId]: op };
    setOverrides(next);
    saveOverrides(next);
  }

  const filteredGold = useMemo(() => {
    const s = q.trim().toLowerCase();
    return leadsGold
      .filter((l) => {
        const lop = leadOp(l);
        if (opFilter !== 'all' && lop !== opFilter) return false;
        if (!s) return true;
        const hay = [l.name, l.phone || '', l.email || '', l.location || '', l.source || ''].join(' ').toLowerCase();
        return hay.includes(s);
      })
      .sort((a, b) => scoreLead(b) - scoreLead(a));
  }, [leadsGold, q, opFilter, overrides]);

  const totals = useMemo(() => {
    const sale = leadsGold.filter((l) => leadOp(l) === 'sale').length;
    const rent = leadsGold.filter((l) => leadOp(l) === 'rent').length;
    const noContact = leadsGold.filter((l) => !l.last_contacted_at).length;
    return { total: leadsGold.length, sale, rent, noContact };
  }, [leadsGold, overrides]);

  const candidatesToAdd = useMemo(() => {
    // Leads “no gold” (no calificados) y no cerrados/perdidos
    return allLeads
      .filter((l) => l.stage !== 'Calificado' && l.stage !== 'Perdido' && l.stage !== 'Cierre')
      .sort((a, b) => (b.budget_max || 0) - (a.budget_max || 0));
  }, [allLeads]);

  const suggestedProperties = useMemo(() => {
    if (!suggestLead) return [];

    const op = leadOp(suggestLead);
    const min = suggestLead.budget_min ?? suggestLead.budget_max ?? 0;
    const max = suggestLead.budget_max ?? suggestLead.budget_min ?? 0;

    const minAdj = Math.max(0, Math.round(min * 0.8));
    const maxAdj = Math.round((max || min) * 1.2);

    const loc = (suggestLead.location || '').toLowerCase();

    const items = properties
      .filter((p) => p.operation === op)
      .map((p) => {
        const price = op === 'sale' ? (p.price_sale || 0) : (p.price_rent || 0);
        const inRange = withinRange(price, minAdj, maxAdj);
        const locScore = loc && p.location ? (p.location.toLowerCase().includes(loc.split(' ')[0]) ? 1 : 0) : 0;
        return { p, price, inRange, locScore };
      })
      .sort((a, b) => {
        if (a.inRange !== b.inRange) return a.inRange ? -1 : 1;
        if (a.locScore !== b.locScore) return b.locScore - a.locScore;
        return Math.abs((a.price || 0) - max) - Math.abs((b.price || 0) - max);
      })
      .slice(0, 6)
      .map((x) => x.p);

    return items;
  }, [suggestLead, properties, overrides]);

  async function handleAddToGold(leadId: string) {
    setAddingId(leadId);
    try {
      await supabase.from('leads').update({ stage: 'Calificado' }).eq('id', leadId);
      await fetchAll();
    } finally {
      setAddingId(null);
      setOpenAdd(false);
    }
  }

  function openSuggestFor(lead: Lead) {
    setSuggestLead(lead);
    setOpenSuggest(true);
  }

  function openScheduleFor(lead: Lead, propertyId: string | null) {
    setScheduleLeadId(lead.id);
    setSchedulePropertyId(propertyId);

    // Defaults: mañana 10:00
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const date = d.toISOString().slice(0, 10);
    const time = '10:00';

    setVisitForm({ date, time, notes: '' });
    setOpenSchedule(true);
  }

  async function handleCreateVisit() {
    if (!scheduleLeadId || !visitForm.date || !visitForm.time) return;
    setCreatingVisit(true);
    try {
      const scheduled_for = new Date(`${visitForm.date}T${visitForm.time}:00`).toISOString();
      const payload: Partial<Visit> = {
        org_id: 'org_demo',
        lead_id: scheduleLeadId,
        property_id: schedulePropertyId || null,
        scheduled_for,
        status: 'programada',
        notes: visitForm.notes.trim() || null,
      };
      await supabase.from('visits').insert(payload as any);
      setOpenSchedule(false);
      setScheduleLeadId(null);
      setSchedulePropertyId(null);
    } finally {
      setCreatingVisit(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="h-16 glass border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-amber-50 p-2 rounded-xl text-amber-700 ring-1 ring-amber-200/50">
            <span className="material-icons">stars</span>
          </div>

          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight truncate">
              Gold List
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Confirmados con presupuesto ·{' '}
              <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{totals.total}</span> clientes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/20 px-3 h-10 shadow-sm">
            <span className="material-icons text-slate-400 text-[18px]">search</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="bg-transparent outline-none text-sm w-64 placeholder:text-slate-400 text-slate-800 dark:text-slate-100"
              placeholder="Buscar cliente…"
            />
          </div>

          <select
            value={opFilter}
            onChange={(e) => setOpFilter(e.target.value as Op)}
            className="h-10 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <option value="all">Todos</option>
            <option value="sale">Compra (USD)</option>
            <option value="rent">Alquiler (S/)</option>
          </select>

          <Button variant="outline" className="h-10" onClick={fetchAll}>
            <span className="material-icons text-[18px]">refresh</span>
            Actualizar
          </Button>

          <Button className="h-10" onClick={() => setOpenAdd(true)}>
            <span className="material-icons text-[18px]">add</span>
            Añadir
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {/* Summary */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <SummaryCard icon="groups" title="Total" value={totals.total} sub="Clientes calificados" tone="primary" />
          <SummaryCard icon="paid" title="Compra" value={totals.sale} sub="USD (ventas)" tone="info" />
          <SummaryCard icon="payments" title="Alquiler" value={totals.rent} sub="S/ (rentas)" tone="success" />
          <SummaryCard icon="schedule" title="Sin contacto" value={totals.noContact} sub="Actualizar seguimiento" tone="warn" />
        </section>

        {/* List */}
        <section className="mt-6 glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-1 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/35 dark:bg-slate-900/20 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Clientes Gold</p>
            <span className="text-xs text-slate-500 dark:text-slate-400">{filteredGold.length}</span>
          </div>

          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredGold.map((lead) => {
              const op = leadOp(lead);
              const score = scoreLead(lead);
              const last = lead.last_contacted_at ? formatDateShort(lead.last_contacted_at) : 'Sin contacto';
              const budget = formatLeadBudget(lead, op);

              return (
                <div
                  key={lead.id}
                  className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 p-4 hover:shadow-elev-1 transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{lead.name}</p>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${opPill(op)}`}>
                          {opLabel(op)}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                          Calificado
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <span className="material-icons text-[16px]">payments</span>
                          <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{budget}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="material-icons text-[16px]">location_on</span>
                          {lead.location || '—'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="material-icons text-[16px]">schedule</span>
                          {last}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Score</div>
                      <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{score}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        className="h-9 px-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/20 hover:bg-white/80 dark:hover:bg-slate-900/30 transition-colors text-sm flex items-center gap-2"
                        onClick={() => openSuggestFor(lead)}
                      >
                        <span className="material-icons text-[18px] text-primary">auto_awesome</span>
                        Sugerir
                      </button>

                      <button
                        className="h-9 px-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/20 hover:bg-white/80 dark:hover:bg-slate-900/30 transition-colors text-sm flex items-center gap-2"
                        onClick={() => openScheduleFor(lead, null)}
                      >
                        <span className="material-icons text-[18px] text-primary">event</span>
                        Agendar
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Objetivo:</span>
                      <select
                        value={op}
                        onChange={(e) => setLeadOpOverride(lead.id, e.target.value as LeadOp)}
                        className="h-9 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        aria-label="Objetivo (compra o alquiler)"
                      >
                        <option value="sale">Compra (USD)</option>
                        <option value="rent">Alquiler (S/)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {lead.phone && (
                      <span className="inline-flex items-center gap-1">
                        <span className="material-icons text-[16px]">call</span>
                        {lead.phone}
                      </span>
                    )}
                    {lead.email && (
                      <span className="inline-flex items-center gap-1">
                        <span className="material-icons text-[16px]">mail</span>
                        {lead.email}
                      </span>
                    )}
                    {lead.source && (
                      <span className="inline-flex items-center gap-1">
                        <span className="material-icons text-[16px]">campaign</span>
                        {lead.source}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {!filteredGold.length && !loading && (
              <div className="lg:col-span-2 rounded-2xl border border-dashed border-slate-300/70 dark:border-slate-700/60 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay clientes en Gold List con los filtros actuales.
              </div>
            )}
          </div>
        </section>

        {loading && (
          <div className="fixed bottom-4 right-4 glass rounded-2xl px-4 py-3 shadow-elev-2 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs text-slate-600 dark:text-slate-300">Cargando Gold List…</div>
          </div>
        )}
      </main>

      {/* Modal: Añadir */}
      {openAdd && (
        <Modal title="Añadir a Gold List" subtitle="Promueve leads a “Calificado” (modo demo local-first).">
          <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {candidatesToAdd.map((l) => (
              <div
                key={l.id}
                className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{l.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Etapa: {l.stage} · Presupuesto: {formatBudgetRange(l.budget_min, l.budget_max)} · {l.location || '—'}
                  </p>
                </div>

                <Button
                  onClick={() => handleAddToGold(l.id)}
                  disabled={addingId === l.id}
                  className="shrink-0"
                >
                  {addingId === l.id ? 'Añadiendo…' : 'Añadir'}
                </Button>
              </div>
            ))}

            {!candidatesToAdd.length && (
              <div className="rounded-2xl border border-dashed border-slate-300/70 dark:border-slate-700/60 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay leads elegibles para añadir.
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end">
            <Button variant="secondary" onClick={() => setOpenAdd(false)}>Cerrar</Button>
          </div>
        </Modal>
      )}

      {/* Modal: Sugerencias */}
      {openSuggest && suggestLead && (
        <Modal
          title="Sugerir propiedades"
          subtitle={`${suggestLead.name} · ${opLabel(leadOp(suggestLead))} · ${formatLeadBudget(suggestLead, leadOp(suggestLead))}`}
        >
          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/20 p-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Candidatas (top 6)</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Selección por rango (±20%) y ubicación aproximada.
              </p>
            </div>

            {suggestedProperties.map((p) => {
              const op = p.operation;
              const price = op === 'sale' ? p.price_sale : p.price_rent;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/55 dark:bg-slate-900/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {p.location || '—'}{p.address ? ` · ${p.address}` : ''} · {p.property_type || '—'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Precio:{' '}
                        <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                          {op === 'sale' ? formatMoney(price, 'USD') : formatMoney(price, 'PEN')}
                        </span>{' '}
                        · {p.status}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <button
                        className="h-9 px-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/20 hover:bg-white/80 dark:hover:bg-slate-900/30 transition-colors text-sm flex items-center gap-2"
                        onClick={() => openScheduleFor(suggestLead, p.id)}
                      >
                        <span className="material-icons text-[18px] text-primary">event_available</span>
                        Agendar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {!suggestedProperties.length && (
              <div className="rounded-2xl border border-dashed border-slate-300/70 dark:border-slate-700/60 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No se encontraron propiedades sugeridas (aún no hay inventario suficiente).
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpenSuggest(false)}>Cerrar</Button>
          </div>
        </Modal>
      )}

      {/* Modal: Agendar visita */}
      {openSchedule && scheduleLeadId && (
        <Modal title="Agendar visita" subtitle="Crea una visita programada (modo demo).">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fecha">
              <input
                type="date"
                value={visitForm.date}
                onChange={(e) => setVisitForm((s) => ({ ...s, date: e.target.value }))}
                className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </Field>

            <Field label="Hora">
              <input
                type="time"
                value={visitForm.time}
                onChange={(e) => setVisitForm((s) => ({ ...s, time: e.target.value }))}
                className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Notas (opcional)">
                <input
                  value={visitForm.notes}
                  onChange={(e) => setVisitForm((s) => ({ ...s, notes: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  placeholder="Ej. Confirmar 1h antes"
                />
              </Field>
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/45 dark:bg-slate-900/20 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lead: <span className="font-semibold text-slate-900 dark:text-white">{scheduleLeadId.substring(0, 6)}</span>
                {schedulePropertyId ? (
                  <>
                    {' '}
                    · Propiedad: <span className="font-semibold text-slate-900 dark:text-white">{schedulePropertyId.substring(0, 6)}</span>
                  </>
                ) : (
                  <>
                    {' '}
                    · <span className="text-slate-400">sin propiedad</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => {
                setOpenSchedule(false);
                setScheduleLeadId(null);
                setSchedulePropertyId(null);
              }}
            >
              Cancelar
            </Button>

            <Button onClick={handleCreateVisit} disabled={creatingVisit || !visitForm.date || !visitForm.time}>
              <span className="material-icons text-[18px]">save</span>
              {creatingVisit ? 'Agendando…' : 'Agendar'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  sub,
  tone,
}: {
  icon: string;
  title: string;
  value: number;
  sub: string;
  tone: 'primary' | 'info' | 'success' | 'warn';
}) {
  const toneStyles =
    tone === 'warn'
      ? 'bg-amber-50 text-amber-800 ring-amber-200/60'
      : tone === 'success'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60'
        : tone === 'info'
          ? 'bg-indigo-50 text-indigo-700 ring-indigo-200/60'
          : 'bg-primary/12 text-primary ring-primary/10';

  return (
    <div className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-1 overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">{sub}</p>
        </div>
        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ring-1 ${toneStyles}`}>
          <span className="material-icons">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />
      <div className="absolute inset-0 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-3xl rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-surface-dark shadow-elev-2">
          <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-700/60 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
            </div>
          </div>
          {children}
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
