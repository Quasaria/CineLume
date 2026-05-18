import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/appStore';
import { getCinemaWeeksOfMonth } from '@/lib/cinema-week';

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p';

function heroSrcSet(url: string): string {
  const match = url.match(/\/t\/p\/[^/]+(\/.+)$/);
  if (!match) return '';
  const path = match[1];
  // TMDB backdrops dispos : w300, w780, w1280, original
  return [`${TMDB_IMG_BASE}/w780${path} 780w`, `${TMDB_IMG_BASE}/w1280${path} 1280w`].join(', ');
}

interface HeroProps {
  backdrops?: string[];
}

const CYCLE_MS = 7000;

export function Hero({ backdrops = [] }: HeroProps) {
  const { t } = useTranslation();
  const { selYear, selMonth, selWeek, selRegion, searchQuery, selectedPerson } = useAppStore();
  const [idx, setIdx] = useState(0);

  const MONTHS_FULL = t('dateNav.monthsFull', { returnObjects: true }) as string[];
  const MONTHS_SHORT = t('dateNav.monthsShort', { returnObjects: true }) as string[];

  useEffect(() => {
    setIdx(0);
  }, [backdrops.join('|')]);

  useEffect(() => {
    if (backdrops.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % backdrops.length);
    }, CYCLE_MS);
    return () => clearInterval(t);
  }, [backdrops.length]);

  const weeks = getCinemaWeeksOfMonth(selYear, selMonth, selRegion);
  const wIdx = Math.min(Math.max(selWeek - 1, 0), Math.max(weeks.length - 1, 0));
  const w = weeks[wIdx];

  let label: string;
  if (selectedPerson) {
    label = t('hero.filmography', { name: selectedPerson.name });
  } else if (searchQuery) {
    label = t('hero.searchResults', { query: searchQuery });
  } else if (!w) {
    label = `${MONTHS_FULL[selMonth]} ${selYear}`;
  } else {
    const sameMonth =
      w.start.getMonth() === w.end.getMonth() &&
      w.start.getFullYear() === w.end.getFullYear();
    label = sameMonth
      ? `${w.start.getDate()}-${w.end.getDate()} ${MONTHS_FULL[w.start.getMonth()]} ${w.start.getFullYear()}`
      : `${w.start.getDate()} ${MONTHS_SHORT[w.start.getMonth()]} - ${w.end.getDate()} ${MONTHS_SHORT[w.end.getMonth()]} ${w.end.getFullYear()}`;
  }

  const currentBackdrop = backdrops[idx];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8 sm:mb-10 relative"
    >
      <div className="hero-stage absolute -top-16 -left-10 -right-10 sm:-left-12 sm:-right-12 h-[180px] sm:h-[460px] rounded-3xl overflow-hidden pointer-events-none">
        <AnimatePresence mode="popLayout">
          {currentBackdrop && (
            <motion.img
              key={currentBackdrop}
              src={currentBackdrop}
              srcSet={heroSrcSet(currentBackdrop)}
              sizes="(max-width: 640px) 100vw, 1200px"
              alt=""
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1.12 }}
              exit={{ opacity: 0, scale: 1.14 }}
              transition={{
                opacity: { duration: 1.6, ease: 'easeInOut' },
                scale: { duration: CYCLE_MS / 1000 + 2, ease: 'linear' },
              }}
              className="hero-stage-img absolute inset-0 w-full h-full object-cover"
            />
          )}
        </AnimatePresence>

        <div className="hero-stage-grain absolute inset-0 mix-blend-overlay opacity-30 pointer-events-none" />
        <div className="hero-stage-overlay absolute inset-0" />
        <div className="hero-stage-sides absolute inset-0" />
      </div>

      <div className="relative pt-8 sm:pt-12">
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-2 drop-shadow-[0_3px_16px_rgba(0,0,0,0.65)]">
          {t('hero.title')} <span className="text-gradient">{t('hero.titleAccent')}</span>
        </h1>
        <p className="text-white/85 text-base sm:text-lg font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{label}</p>

        {backdrops.length > 1 && (
          <div className="hidden sm:flex gap-1.5 mt-4" aria-hidden="true">
            {backdrops.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i === idx ? 'w-6 bg-white/80' : 'w-2 bg-white/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
