export type LabelKey =
  | 'Client'
  | 'Family'
  | 'Friend'
  | 'Professor'
  | 'Team'
  | 'Other';

export const LABEL_COLORS: Record<LabelKey, string> = {
  Client:    '#3b82f6',
  Family:    '#ec4899',
  Friend:    '#22c55e',
  Professor: '#a855f7',
  Team:      '#f59e0b',
  Other:     '#6b7280',
};

export const LABELS: LabelKey[] = ['Client', 'Family', 'Friend', 'Professor', 'Team', 'Other'];

export interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  label: LabelKey;
  customLabel?: string;
  enabled: boolean;
}

export const DEFAULT_CITIES: City[] = [];
