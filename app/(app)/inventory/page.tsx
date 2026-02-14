'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Property } from '@/types';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/utils';

type OpFilter = 'all' | 'sale' | 'rent';
type StatusFilter = 'all' | Property['status'];

function n(v: string) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function InventoryPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);

  const [q, setQ] = useState('');
  const [op, setOp] = useState<OpFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  const [openNew, setOpenNew] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    title: '',
    operation: 'sale' as Property['operation'],
    price_sale: '',
    price_rent: '',
    location: '',
    address: '',
    property_type: 'Casa',
    bedrooms: '',
    bathrooms: '',
    area_sqm: '',
    status: 'Active' as Property['status'],
    description: '',
    amenities: '',
  });

  const fetchProps = async () => {
    setLoading(true);
    const { data } = await supabase.from('properties').select('*');
    setProperties((data as Property[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return properties
      .filter((p) => (op === 'all' ? true : p.operation === op))
      .filter((p) => (status === 'all' ? true : p.status === status))
      .filter((p) => {
        if (!s) return true;
        const hay = [p.title, p.location || '', p.address || '', p.property_type || '', p.status, p.operation].join(' ').toLowerCase();
        return hay.includes(s);
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [properties, q, op, status]);

  const totals = useMemo(() => {
    const activeSaleUSD = properties
      .filter((p) => p.operation === 'sale' && p.status === 'Active')
      .reduce((sum, p) => sum + (p.price_sale || 0), 0);

    const activeRentPEN = properties
      .filter((p) => p.operation === 'rent' && p.status === 'Active')
      .reduce((sum, p) => sum + (p.price_rent || 0), 0);

    return { activeSaleUSD, activeRentPEN };
  }, [properties]);

  function openModal() {
    setForm({
      title: '',
      operation: 'sale',
      price_sale: '',
      price_rent: '',
      location: '',
      address: '',
      property_type: 'Casa',
      bedrooms: '',
      bathrooms: '',
      area_sqm: '',
      status: 'Active',
      description: '',
      amenities: '',
    });
    setOpenNew(true);
  }

  const canSave = useMemo(() => {
    if (!form.title.trim()) return false;
    if (form.operation === 'sale' && !form.price_sale.trim()) return false;
    if (form.operation === 'rent' && !form.price_rent.trim()) return false;
    return true;
  }, [form.title, form.operation, form.price_sale, form.price_rent]);

  async function createProperty() {
    setCreating(true);
    try {
      const payload: Partial<Property> = {
        org_id: 'org_demo',
        title: form.title.trim(),
        operation: form.operation,
        status: form.status,
        location: form.location.trim() || null,
        address: form.address.trim() || null,
        property_type: form.property_type.trim() || null,
        bedrooms: form.bedrooms ? n(form.bedrooms) : null,
        bathrooms: form.bathrooms ? n(form.bathrooms) : null,
        area_sqm: form.area_sqm ? n(form.area_sqm) : null,
        price_sale: form.operation === 'sale' ? (form.price_sale ? n(form.price_sale) : null) : null,
        price_rent: form.operation === 'rent' ? (form.price_rent ? n(form.price_rent) : null) : null,
        description: form.description.trim() || null,
        amenities: form.amenities.trim()
          ? form.amenities.split(',').map((x) => x.trim()).filter(Boolean)
          : null,
      };

      const { data } = await supabase.from('properties').insert(payload as any);
      if (data && Array.isArray(data)) setProperties((prev) => [data[0] as Property, ...prev]);
      else await fetchProps();

      setOpenNew(false);
    } finally {
      setCreating(false);
    }
  }

  function StatusBadge({ value }: { value: Property['status'] }) {
    const cls =
      value === 'Active'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
        : value === 'Pending'
          ? 'bg-amber-50 text-amber-800 border-amber-200/60'
          : 'bg-slate-100 text-slate-700 border-slate-200/60';
    return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{value}</span>;
  }

  function OpBadge({ value }: { value: Property['operation'] }) {
    const cls = value === 'sale' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
    return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{value === 'sale' ? 'Venta' : 'Alquiler'}</span>;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="h-16 glass border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="material-icons text-primary text-[18px]">home_work</span>
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight">Propiedades</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Activos: <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{properties.filter((p) => p.status === 'Active').length}</span>{' '}
            · Venta: <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{formatMoney(totals.activeSaleUSD, 'USD')}</span>{' '}
            · Alquiler: <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{formatMoney(totals.activeRentPEN, 'PEN')}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/20 px-3 h-10 shadow-sm">
            <span className="material-icons text-slate-400 text-[18px]">search</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="bg-transparent outline-none text-sm w-64 placeholder:text-slate-400 text-slate-800 dark:text-slate-100"
              placeholder="Buscar propiedades…"
            />
          </div>

          <select
            value={op}
            onChange={(e) => setOp(e.target.value as OpFilter)}
            className="h-10 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <option value="all">Todas</option>
            <option value="sale">Venta (USD)</option>
            <option value="rent">Alquiler (S/)</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="h-10 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <option value="all">Todos</option>
            <option value="Active">Activo</option>
            <option value="Pending">Pendiente</option>
            <option value="Sold">Vendido</option>
          </select>

          <Button variant="outline" className="h-10" onClick={fetchProps}>
            <span className="material-icons text-[18px]">refresh</span>
            Actualizar
          </Button>

          <Button className="h-10" onClick={openModal}>
            <span className="material-icons text-[18px]">add</span>
            Nueva
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((p) => {
            const price =
              p.operation === 'sale' ? formatMoney(p.price_sale, 'USD') : formatMoney(p.price_rent, 'PEN');

            return (
              <div key={p.id} className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-elev-1 overflow-hidden group">
                <div className="h-44 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-indigo-100/40 to-slate-200/30 dark:from-primary/15 dark:via-slate-900/30 dark:to-slate-800/20" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-slate-950/25 to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <StatusBadge value={p.status} />
                    <OpBadge value={p.operation} />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">{price}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                      {p.location || '—'}{p.address ? ` · ${p.address}` : ''}
                    </p>
                  </div>
                  <div className="absolute top-3 right-3 h-10 w-10 rounded-2xl bg-white/70 dark:bg-slate-900/30 border border-white/40 dark:border-slate-700/60 flex items-center justify-center shadow-sm">
                    <span className="material-icons text-primary">photo</span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {p.property_type || 'Propiedad'}{p.area_sqm ? ` · ${p.area_sqm} m²` : ''}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-white/60 dark:bg-slate-900/20 border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300">
                      {p.bedrooms ? `${p.bedrooms} hab.` : '—'} · {p.bathrooms ? `${p.bathrooms} baños` : '—'}
                    </span>
                  </div>

                  {p.description && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{p.description}</p>}

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Button variant="outline" className="h-9 text-xs" onClick={() => navigator.clipboard?.writeText(p.id)}>
                      <span className="material-icons text-[16px]">content_copy</span>
                      Copiar ID
                    </Button>
                    <Button variant="secondary" className="h-9 text-xs" onClick={() => navigator.clipboard?.writeText(`${p.title} · ${price}`)}>
                      <span className="material-icons text-[16px]">share</span>
                      Copiar resumen
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {!filtered.length && !loading && (
            <div className="glass rounded-2xl border border-dashed border-slate-300/70 dark:border-slate-700/60 p-10 text-center text-slate-500 dark:text-slate-400">
              No hay propiedades para mostrar.
            </div>
          )}
        </div>

        {loading && (
          <div className="fixed bottom-4 right-4 glass rounded-2xl px-4 py-3 shadow-elev-2 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs text-slate-600 dark:text-slate-300">Cargando propiedades…</div>
          </div>
        )}
      </main>

      {/* Modal */}
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
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Nueva propiedad</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Modo demo (local-first). No se altera estructura.</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Título *">
                    <input
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={form.title}
                      onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                      placeholder="Ej. Casa moderna con piscina"
                    />
                  </Field>

                  <Field label="Operación">
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={form.operation}
                      onChange={(e) => setForm((s) => ({ ...s, operation: e.target.value as any }))}
                    >
                      <option value="sale">Venta (USD)</option>
                      <option value="rent">Alquiler (S/)</option>
                    </select>
                  </Field>

                  {form.operation === 'sale' ? (
                    <Field label="Precio venta (USD) *">
                      <input
                        inputMode="numeric"
                        className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        value={form.price_sale}
                        onChange={(e) => setForm((s) => ({ ...s, price_sale: e.target.value.replace(/[^0-9]/g, '') }))}
                        placeholder="Ej. 180000"
                      />
                    </Field>
                  ) : (
                    <Field label="Precio alquiler (S/) *">
                      <input
                        inputMode="numeric"
                        className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        value={form.price_rent}
                        onChange={(e) => setForm((s) => ({ ...s, price_rent: e.target.value.replace(/[^0-9]/g, '') }))}
                        placeholder="Ej. 1600"
                      />
                    </Field>
                  )}

                  <Field label="Estado">
                    <select
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={form.status}
                      onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as any }))}
                    >
                      <option value="Active">Activo</option>
                      <option value="Pending">Pendiente</option>
                      <option value="Sold">Vendido</option>
                    </select>
                  </Field>

                  <Field label="Zona / Ubicación">
                    <input
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={form.location}
                      onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
                      placeholder="Urbanización / Distrito"
                    />
                  </Field>

                  <Field label="Tipo">
                    <input
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={form.property_type}
                      onChange={(e) => setForm((s) => ({ ...s, property_type: e.target.value }))}
                      placeholder="Casa / Departamento / Terreno…"
                    />
                  </Field>

                  <Field label="Dormitorios">
                    <input
                      inputMode="numeric"
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={form.bedrooms}
                      onChange={(e) => setForm((s) => ({ ...s, bedrooms: e.target.value.replace(/[^0-9]/g, '') }))}
                      placeholder="3"
                    />
                  </Field>

                  <Field label="Baños">
                    <input
                      inputMode="numeric"
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={form.bathrooms}
                      onChange={(e) => setForm((s) => ({ ...s, bathrooms: e.target.value.replace(/[^0-9]/g, '') }))}
                      placeholder="2"
                    />
                  </Field>

                  <Field label="Área (m²)">
                    <input
                      inputMode="numeric"
                      className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      value={form.area_sqm}
                      onChange={(e) => setForm((s) => ({ ...s, area_sqm: e.target.value.replace(/[^0-9]/g, '') }))}
                      placeholder="220"
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <Field label="Dirección">
                      <input
                        className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        value={form.address}
                        onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                        placeholder="Iquitos, Loreto"
                      />
                    </Field>
                  </div>

                  <div className="sm:col-span-2">
                    <Field label="Amenities (coma separada)">
                      <input
                        className="h-10 w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        value={form.amenities}
                        onChange={(e) => setForm((s) => ({ ...s, amenities: e.target.value }))}
                        placeholder="Piscina, Parrilla, Cochera…"
                      />
                    </Field>
                  </div>

                  <div className="sm:col-span-2">
                    <Field label="Descripción">
                      <textarea
                        className="min-h-[96px] w-full rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/20 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        value={form.description}
                        onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                        placeholder="Breve descripción para el inventario…"
                      />
                    </Field>
                  </div>

                  <div className="sm:col-span-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/45 dark:bg-slate-900/20 p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Vista previa:{' '}
                      <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                        {form.operation === 'sale'
                          ? formatMoney(form.price_sale ? n(form.price_sale) : null, 'USD')
                          : formatMoney(form.price_rent ? n(form.price_rent) : null, 'PEN')}
                        {' · '}
                        {form.location || '—'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <Button variant="secondary" onClick={() => setOpenNew(false)}>
                  Cancelar
                </Button>
                <Button onClick={createProperty} disabled={creating || !canSave}>
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
