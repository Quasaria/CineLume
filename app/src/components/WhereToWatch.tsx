import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { getWatchProviders } from '@/lib/tmdb';

interface WhereToWatchProps {
  movieId: number;
  region: string;
}

const TMDB_LOGO_BASE = 'https://image.tmdb.org/t/p/original';

/**
 * Section "Ou regarder" dans la modale film : affiche les plateformes
 * streaming/location/achat disponibles dans la region selectionnee, avec
 * leurs logos officiels (via TMDB). Lien direct vers la page TMDB qui
 * agrege les liens vers chaque service.
 *
 * N'affiche rien si pas de data pour la region (silently). Sa presence
 * vit ou meurt avec la disponibilite TMDB.
 */
export function WhereToWatch({ movieId, region }: WhereToWatchProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['watchProviders', movieId],
    queryFn: ({ signal }) => getWatchProviders(movieId, signal),
    staleTime: 1000 * 60 * 60 * 24, // 24h
  });

  if (isLoading) return null;
  const regionData = data?.results?.[region];
  if (!regionData) return null;

  const flatrate = regionData.flatrate || [];
  const rent = regionData.rent || [];
  const buy = regionData.buy || [];
  if (flatrate.length === 0 && rent.length === 0 && buy.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-white text-sm sm:text-base">{t('modal.whereToWatch')}</h3>
        {regionData.link && (
          <a
            href={regionData.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-300 hover:text-violet-200 inline-flex items-center gap-1 transition-colors"
          >
            {t('modal.allOptions')}
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        )}
      </div>

      {flatrate.length > 0 && (
        <ProviderRow label={t('modal.streaming')} items={flatrate} link={regionData.link} />
      )}
      {rent.length > 0 && (
        <ProviderRow label={t('modal.rent')} items={rent} link={regionData.link} />
      )}
      {buy.length > 0 && (
        <ProviderRow label={t('modal.buy')} items={buy} link={regionData.link} />
      )}
      <p className="text-[10px] text-white/35 mt-2">{t('modal.dataByJustwatch')}</p>
    </section>
  );
}

interface ProviderRowProps {
  label: string;
  items: { provider_id: number; provider_name: string; logo_path: string }[];
  link?: string;
}

function ProviderRow({ label, items, link }: ProviderRowProps) {
  return (
    <div className="mb-2">
      <p className="text-[10px] text-white/45 uppercase tracking-wider font-bold mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => {
          const content = (
            <>
              <img
                src={`${TMDB_LOGO_BASE}${p.logo_path}`}
                alt=""
                className="w-8 h-8 rounded-md"
                loading="lazy"
              />
              <span className="text-xs font-medium text-white/85 truncate">{p.provider_name}</span>
            </>
          );
          const className = "flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] active:bg-white/[0.09] transition-colors";
          return link ? (
            <a
              key={p.provider_id}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {content}
            </a>
          ) : (
            <div key={p.provider_id} className={className}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
