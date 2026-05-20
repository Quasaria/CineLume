/**
 * Calcule la taille approximative du cache localStorage utilise par
 * l'app (entrees md_*, rd_*, genres_cache, cinelume_cache). On somme
 * la longueur en chars * 2 (UTF-16) pour estimer en bytes.
 *
 * Renvoie aussi le nombre d'entrees pour debug.
 */
export function computeCacheStats(): { bytes: number; entries: number } {
  let bytes = 0;
  let entries = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (!(key.startsWith('md_') || key.startsWith('rd_') || key.startsWith('genres_cache') || key === 'cinelume_cache')) continue;
      const value = localStorage.getItem(key) || '';
      bytes += (key.length + value.length) * 2;
      entries += 1;
    }
  } catch {
    // localStorage indispo
  }
  return { bytes, entries };
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}
