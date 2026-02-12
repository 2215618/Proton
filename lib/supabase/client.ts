import { createBrowserClient } from '@supabase/ssr'
import type { Lead, Property, Task, Visit, LeadStage } from '@/types'

/**
 * MODO LOCAL-FIRST (costo cero):
 * - Si NO existen NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   devolvemos un "cliente mock" que persiste en localStorage (en navegador)
 *   y usa una DB en memoria (en SSR/build) para que Next pueda prerenderizar.
 * - Si existen credenciales y DATA_MODE != 'local', se usa Supabase real.
 */

const DATA_MODE = (process.env.NEXT_PUBLIC_DATA_MODE || 'auto') as 'auto' | 'local' | 'supabase'

type MockDB = {
  leads: Lead[]
  properties: Property[]
  visits: Visit[]
  tasks: Task[]
}

const STORAGE_KEY = 'lg_crm_mock_v1'
const SESSION_KEY = 'lg_crm_session_v1'

function nowISO() {
  return new Date().toISOString()
}

function uid() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis as any
  return typeof g.crypto?.randomUUID === 'function' ? g.crypto.randomUUID() : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

function seedDB(): MockDB {
  const org_id = 'org_demo'
  const base: Omit<Lead, 'id' | 'created_at'> = {
    org_id,
    name: 'Juan Perez',
    email: 'juan.perez@gmail.com',
    phone: '+51 965 608 934',
    source: 'Facebook',
    stage: 'Calificado',
    budget_min: 120000,
    budget_max: 180000,
    location: 'Iquitos - San Juan',
    assigned_to: null,
    last_contacted_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  }

  const lead1: Lead = { id: uid(), created_at: nowISO(), ...base }
  const lead2: Lead = {
    id: uid(),
    created_at: nowISO(),
    org_id,
    name: 'María García',
    email: 'maria.garcia@gmail.com',
    phone: '+51 900 000 000',
    source: 'Referido',
    stage: 'Nuevo',
    budget_min: 1500,
    budget_max: 2000,
    location: 'Iquitos - Punchana',
    assigned_to: null,
    last_contacted_at: null,
  }

  const prop1: Property = {
    id: uid(),
    created_at: nowISO(),
    org_id,
    title: 'Casa moderna con piscina',
    operation: 'sale',
    price_sale: 180000,
    price_rent: null,
    location: 'Urbanización Miami',
    address: 'Iquitos, Loreto',
    property_type: 'Casa',
    bedrooms: 3,
    bathrooms: 3,
    area_sqm: 220,
    status: 'Active',
    description: 'Propiedad moderna con finos acabados.',
    amenities: ['Piscina', 'Bar', 'Parrilla'],
  }

  const prop2: Property = {
    id: uid(),
    created_at: nowISO(),
    org_id,
    title: 'Mini departamento amoblado',
    operation: 'rent',
    price_sale: null,
    price_rent: 1600,
    location: 'Cerca UNAP Odontología',
    address: 'Iquitos, Loreto',
    property_type: 'Departamento',
    bedrooms: 2,
    bathrooms: 2,
    area_sqm: 65,
    status: 'Active',
    description: 'Funcional y listo para ocupar.',
    amenities: ['Menajería', 'Ventilador'],
  }

  const visit1: Visit = {
    id: uid(),
    created_at: nowISO(),
    org_id,
    lead_id: lead1.id,
    property_id: prop1.id,
    scheduled_for: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    status: 'programada',
    notes: 'Confirmar 1h antes',
  }

  const task1: Task = {
    id: uid(),
    created_at: nowISO(),
    org_id,
    title: 'Llamar a prospecto nuevo',
    due_date: new Date().toISOString().slice(0, 10),
    status: 'pending',
    related_type: 'lead',
    related_id: lead2.id,
    assignee_id: null,
  }

  return {
    leads: [lead1, lead2],
    properties: [prop1, prop2],
    visits: [visit1],
    tasks: [task1],
  }
}

function loadLocalDB(): MockDB {
  // SSR/build-safe
  if (typeof window === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis as any
    g.__LG_CRM_MOCK_DB__ = g.__LG_CRM_MOCK_DB__ || seedDB()
    return g.__LG_CRM_MOCK_DB__ as MockDB
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seeded = seedDB()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
      return seeded
    }
    return JSON.parse(raw) as MockDB
  } catch {
    const seeded = seedDB()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
}

function saveLocalDB(db: MockDB) {
  if (typeof window === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis as any
    g.__LG_CRM_MOCK_DB__ = db
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function parseInList(raw: string): string[] {
  // raw ejemplo: ("Perdido","Cierre","Nuevo")
  const cleaned = raw.trim().replace(/^\(/, '').replace(/\)$/, '')
  return cleaned
    .split(',')
    .map((s) => s.trim().replace(/^"/, '').replace(/"$/, '').replace(/^'/, '').replace(/'$/, ''))
    .filter(Boolean)
}

type SelectOptions = { count?: 'exact'; head?: boolean }

class MockQuery<T extends { id: string }>
{
  private table: keyof MockDB
  private filters: Array<(row: any) => boolean> = []
  private updateValues: Partial<T> | null = null
  private deleteMode = false

  constructor(table: keyof MockDB) {
    this.table = table
  }

  eq<K extends keyof T>(column: K, value: any) {
    this.filters.push((r) => (r as any)[column] === value)
    // Si venimos de update/delete, ejecutamos al final
    if (this.updateValues) return this.execUpdate()
    if (this.deleteMode) return this.execDelete()
    return this
  }

  not<K extends keyof T>(column: K, operator: string, value: any) {
    if (operator === 'in') {
      const list = Array.isArray(value) ? value : parseInList(String(value))
      this.filters.push((r) => !list.includes(String((r as any)[column])))
    }
    return this
  }

  async select(_columns: string = '*', opts?: SelectOptions): Promise<{ data: T[] | null; count?: number | null }>{
    const db = loadLocalDB()
    const rows = (db[this.table] as any[]).filter((r) => this.filters.every((f) => f(r))) as T[]
    const count = opts?.count === 'exact' ? rows.length : null
    if (opts?.head) return { data: null, count }
    return { data: rows, count }
  }

  update(values: Partial<T>) {
    this.updateValues = values
    return this
  }

  private async execUpdate(): Promise<{ data: T[] | null }>{
    const db = loadLocalDB()
    const rows = db[this.table] as any[]
    const updated: T[] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (this.filters.every((f) => f(row))) {
        rows[i] = { ...row, ...this.updateValues }
        updated.push(rows[i])
      }
    }
    saveLocalDB(db)
    return { data: updated as any }
  }

  async insert(values: Partial<T> | Partial<T>[]): Promise<{ data: T[] | null }>{
    const arr = Array.isArray(values) ? values : [values]
    const db = loadLocalDB()
    const rows = db[this.table] as any[]
    const created: T[] = arr.map((v) => ({ id: uid(), created_at: nowISO(), ...(v as any) })) as any
    rows.unshift(...created)
    saveLocalDB(db)
    return { data: created }
  }

  delete() {
    this.deleteMode = true
    return this
  }

  private async execDelete(): Promise<{ data: T[] | null }>{
    const db = loadLocalDB()
    const rows = db[this.table] as any[]
    const remaining = rows.filter((r) => !this.filters.every((f) => f(r)))
    ;(db[this.table] as any) = remaining
    saveLocalDB(db)
    return { data: null }
  }
}

function getSessionLocal() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as any) : null
  } catch {
    return null
  }
}

function setSessionLocal(session: any) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function clearSessionLocal() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SESSION_KEY)
}

function createMockClient() {
  return {
    from: (table: keyof MockDB) => new MockQuery<any>(table),
    auth: {
      async signInWithPassword({ email }: { email: string; password: string }) {
        // Login demo (modo local): acepta cualquier password no vacía
        if (!email) return { data: { session: null }, error: { message: 'Email requerido' } }
        const session = { user: { id: 'user_demo', email } }
        setSessionLocal(session)
        return { data: { session }, error: null }
      },
      async getSession() {
        const session = getSessionLocal()
        return { data: { session } }
      },
      async signOut() {
        clearSessionLocal()
        return { error: null }
      },
    },
  }
}

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const shouldUseSupabase =
    DATA_MODE === 'supabase' || (DATA_MODE === 'auto' && Boolean(url) && Boolean(key))

  if (shouldUseSupabase && url && key) {
    // IMPORTANTE: estos componentes son "use client" pero Next puede prerenderizar.
    // Evitamos instanciar un cliente de navegador en SSR/build.
    if (typeof window !== 'undefined') {
      return createBrowserClient(url, key)
    }
    // SSR/build: devolvemos mock para no romper el build.
    return createMockClient() as any
  }

  return createMockClient() as any
}
