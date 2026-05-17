import type { City } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'soluxyzon.worldclock.cities.v3';

// ---------- localStorage (guest mode) ----------

export function loadLocalCities(): City[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as City[];
    return Array.isArray(parsed)
      ? parsed.map((c) => ({ ...c, enabled: c.enabled ?? true }))
      : [];
  } catch {
    return [];
  }
}

export function saveLocalCities(cities: City[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cities)); } catch {}
}

export function clearLocalCities(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// ---------- Supabase (signed-in mode) ----------

interface CityRow {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  label: string;
  custom_label: string | null;
  enabled: boolean;
}

function rowToCity(r: CityRow): City {
  return {
    id: r.id,
    name: r.name,
    country: r.country,
    lat: r.lat,
    lng: r.lng,
    timezone: r.timezone,
    label: r.label as City['label'],
    customLabel: r.custom_label ?? undefined,
    enabled: r.enabled,
  };
}

function cityToRow(c: City, userId: string) {
  return {
    user_id: userId,
    id: c.id,
    name: c.name,
    country: c.country,
    lat: c.lat,
    lng: c.lng,
    timezone: c.timezone,
    label: c.label,
    custom_label: c.customLabel ?? null,
    enabled: c.enabled,
  };
}

export async function loadRemoteCities(supabase: SupabaseClient, userId: string): Promise<City[]> {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('[soluXYZon] loadRemoteCities:', error.message);
    return [];
  }
  return (data ?? []).map((row) => rowToCity(row as CityRow));
}

/** Full overwrite — diff & upsert + delete the rows that disappeared. */
export async function syncRemoteCities(
  supabase: SupabaseClient,
  userId: string,
  cities: City[],
): Promise<void> {
  // Upsert everything currently in state
  if (cities.length > 0) {
    const rows = cities.map((c) => cityToRow(c, userId));
    const { error: upsertErr } = await supabase
      .from('cities')
      .upsert(rows, { onConflict: 'user_id,id' });
    if (upsertErr) console.error('[soluXYZon] upsert:', upsertErr.message);
  }

  // Delete remote rows whose id is no longer in our local set
  const keepIds = cities.map((c) => c.id);
  let del = supabase.from('cities').delete().eq('user_id', userId);
  if (keepIds.length > 0) del = del.not('id', 'in', `(${keepIds.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(',')})`);
  const { error: delErr } = await del;
  if (delErr) console.error('[soluXYZon] delete-pruned:', delErr.message);
}

export async function upsertRemoteCity(
  supabase: SupabaseClient,
  userId: string,
  city: City,
): Promise<void> {
  const { error } = await supabase
    .from('cities')
    .upsert(cityToRow(city, userId), { onConflict: 'user_id,id' });
  if (error) console.error('[soluXYZon] upsertRemoteCity:', error.message);
}

export async function deleteRemoteCity(
  supabase: SupabaseClient,
  userId: string,
  cityId: string,
): Promise<void> {
  const { error } = await supabase
    .from('cities')
    .delete()
    .eq('user_id', userId)
    .eq('id', cityId);
  if (error) console.error('[soluXYZon] deleteRemoteCity:', error.message);
}
