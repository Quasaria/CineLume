import type { CustomList } from '@/types/movie';

/**
 * Encode/decode d'une liste partagee dans le hash de l'URL. On serialise
 * juste le minimum (nom, emoji, ids de films) en JSON puis on base64-url-
 * encode pour eviter les caracteres problematiques dans l'URL.
 *
 * Format : #share/<base64url>
 *
 * Le receveur fetch chaque id depuis TMDB pour reconstruire les films,
 * puis cree une nouvelle liste localement.
 */

export interface SharedList {
  name: string;
  emoji?: string;
  ids: number[];
}

function base64UrlEncode(s: string): string {
  // btoa marche sur ascii donc on encode prealablement l'utf-8 via
  // encodeURIComponent + le trick %xx -> char pour passer en ascii.
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): string {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeSharedList(list: CustomList): string {
  const payload: SharedList = {
    name: list.name,
    emoji: list.emoji,
    ids: list.films.map((f) => f.id),
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  // origin + pathname pour conserver le base url de l'app (gh pages).
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#share/${encoded}`;
}

export function decodeSharedList(hash: string): SharedList | null {
  // Accepte aussi un prefixe '#' ou '#share/' devant.
  let raw = hash;
  if (raw.startsWith('#')) raw = raw.slice(1);
  if (raw.startsWith('share/')) raw = raw.slice('share/'.length);
  if (!raw) return null;
  try {
    const json = base64UrlDecode(raw);
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || !parsed) return null;
    const name = typeof parsed.name === 'string' ? parsed.name : '';
    const emoji = typeof parsed.emoji === 'string' ? parsed.emoji : undefined;
    const ids = Array.isArray(parsed.ids) ? parsed.ids.filter((x: unknown) => typeof x === 'number') : [];
    if (!name || ids.length === 0) return null;
    return { name, emoji, ids };
  } catch {
    return null;
  }
}
