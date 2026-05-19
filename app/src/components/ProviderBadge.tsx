import type { Provider } from '@/lib/tmdb';

interface ProviderBadgeProps {
  provider: Provider;
  size?: 'sm' | 'md';
}

/**
 * Petit badge carre arrondi avec l'initiale du provider sur sa couleur de
 * marque. Plus stable que d'afficher les vrais logos (chemins TMDB qui
 * changent + trademark) tout en restant visuellement reconnaissable.
 */
export function ProviderBadge({ provider, size = 'md' }: ProviderBadgeProps) {
  const dimensions = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]';
  return (
    <span
      className={`${dimensions} rounded flex items-center justify-center font-black text-white shrink-0 leading-none`}
      style={{ background: provider.color }}
      aria-hidden="true"
    >
      {provider.initial}
    </span>
  );
}
