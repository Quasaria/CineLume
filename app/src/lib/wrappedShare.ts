/**
 * Strategie de partage du Wrapped. Web Share API quand disponible (mobile
 * recent, ouvre la share sheet system avec l'image en piece-jointe), sinon
 * download de l'image PNG + intentions web pour Twitter/WhatsApp.
 *
 * Instagram et TikTok n'ont pas d'API web pour poster directement, l'user
 * doit telecharger puis ouvrir l'app. On affiche les boutons malgre tout
 * pour les ouvrir avec le bon fallback.
 */

export interface ShareResult {
  method: 'native' | 'download' | 'cancelled' | 'error';
  error?: string;
}

interface ShareTextOptions {
  text: string;
  url: string;
}

/**
 * Tente de partager via navigator.share avec le fichier en attachement.
 * Si pas dispose ou refuse, retombe sur le download.
 */
export async function shareWrappedImage(
  blob: Blob,
  filename: string,
  textOptions: ShareTextOptions,
): Promise<ShareResult> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: textOptions.text,
        text: `${textOptions.text}\n${textOptions.url}`,
      });
      return { method: 'native' };
    } catch (e) {
      const err = e as Error;
      if (err.name === 'AbortError') return { method: 'cancelled' };
      // Fallthrough vers download
    }
  }

  return downloadBlob(blob, filename);
}

export function downloadBlob(blob: Blob, filename: string): ShareResult {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { method: 'download' };
  } catch (e) {
    return { method: 'error', error: (e as Error).message };
  }
}

/** Twitter web intent : ouvre tweet composer avec texte + url. Pas d'image
 * via intent. On telecharge l'image en parallele si demande. */
export function openTwitterIntent(text: string, url: string) {
  const params = new URLSearchParams({ text, url });
  window.open(`https://twitter.com/intent/tweet?${params.toString()}`, '_blank', 'noopener,noreferrer');
}

/** WhatsApp web : ouvre une conversation avec le texte pre-rempli. L'image
 * doit etre attachee manuellement (limitation API). */
export function openWhatsAppIntent(text: string, url: string) {
  const full = `${text}\n${url}`;
  const params = new URLSearchParams({ text: full });
  window.open(`https://wa.me/?${params.toString()}`, '_blank', 'noopener,noreferrer');
}

/** Copie le texte dans le clipboard pour partage manuel. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
