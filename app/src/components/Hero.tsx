import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/appStore';
import { getCinemaWeeksOfMonth } from '@/lib/cinema-week';

export function Hero() {
  const { t } = useTranslation();
  const { selYear, selMonth, selWeek, selRegion, searchQuery, selectedPerson } = useAppStore();

  const MONTHS_FULL = t('dateNav.monthsFull', { returnObjects: true }) as string[];
  const MONTHS_SHORT = t('dateNav.monthsShort', { returnObjects: true }) as string[];

  const weeks = getCinemaWeeksOfMonth(selYear, selMonth, selRegion);
  const wIdx = Math.min(Math.max(selWeek - 1, 0), Math.max(weeks.length - 1, 0));
  const w = weeks[wIdx];

  // En mode personne, on n'affiche pas le label semaine (le PersonHeader
  // prend le relais avec photo/bio plus bas).
  let label: string | null;
  if (selectedPerson) {
    label = null;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="hero-title relative mb-4 sm:mb-10 pt-40 md:pt-56 lg:pt-72 z-10"
    >
      {/* Le titre est toujours pose sur le degrade sombre de la backdrop, donc
          on force le blanc en inline pour court-circuiter l'override .text-white
          qui le rendrait sombre en light mode. */}
      <h1
        style={{ color: '#ffffff' }}
        className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-1 sm:mb-2 [filter:drop-shadow(0_3px_12px_rgba(0,0,0,0.9))_drop-shadow(0_0_28px_rgba(0,0,0,0.6))]"
      >
        {t('hero.title')} <span className="text-gradient">{t('hero.titleAccent')}</span>
      </h1>
      {label && (
        <p
          style={{ color: 'rgba(255, 255, 255, 0.95)' }}
          className="text-sm sm:text-lg font-light [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.9))_drop-shadow(0_0_16px_rgba(0,0,0,0.5))]"
        >
          {label}
        </p>
      )}
    </motion.div>
  );
}
