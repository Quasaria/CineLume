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
  // Format avec slash apres # pour rester compatible HashRouter.
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/share/${encoded}`;
}

export function decodeSharedList(hash: string): SharedList | null {
  // Accepte les anciens (#share/) et nouveaux (#/share/) formats.
  let raw = hash;
  if (raw.startsWith('#')) raw = raw.slice(1);
  if (raw.startsWith('/')) raw = raw.slice(1);
  if (raw.startsWith('share/')) raw = raw.slice('share/'.length);
  if (!raw) return null;
  try {
    const json = base64UrlDecode(raw);
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || !parsed) return null;
    // Defense in depth : on borne le nom a 100 chars (UX + anti-DoS du
    // toast), l'emoji a 8 chars (max emoji compose), et on filtre les ids
    // a des entiers positifs avec cap 100 (anti-DoS via fetch en masse :
    // un attaquant pourrait sinon partager un lien #/share/ avec 1M d'ids
    // qui declencherait autant de fetch TMDB).
    const rawName = typeof parsed.name === 'string' ? parsed.name : '';
    const name = rawName.slice(0, 100);
    const rawEmoji = typeof parsed.emoji === 'string' ? parsed.emoji : undefined;
    const emoji = rawEmoji && rawEmoji.length <= 8 ? rawEmoji : undefined;
    const ids = Array.isArray(parsed.ids)
      ? parsed.ids
          .filter((x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x > 0 && x < 1e9)
          .slice(0, 100)
      : [];
    if (!name || ids.length === 0) return null;
    return { name, emoji, ids };
  } catch {
    return null;
  }
}
