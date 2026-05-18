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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="hero-title relative mb-4 sm:mb-10 pt-40 sm:pt-72 z-10"
    >
      <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-1 sm:mb-2 drop-shadow-[0_3px_16px_rgba(0,0,0,0.85)]">
        {t('hero.title')} <span className="text-gradient">{t('hero.titleAccent')}</span>
      </h1>
      <p className="text-white/90 text-sm sm:text-lg font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{label}</p>
    </motion.div>
  );
}
