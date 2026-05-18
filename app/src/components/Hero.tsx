import { motion } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { getCinemaWeeksOfMonth } from '@/lib/cinema-week';

const MONTHS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MONTHS_SHORT = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];

interface HeroProps {
  backdropUrl?: string;
}

export function Hero({ backdropUrl }: HeroProps) {
  const { selYear, selMonth, selWeek, selRegion, searchQuery } = useAppStore();

  const weeks = getCinemaWeeksOfMonth(selYear, selMonth, selRegion);
  const idx = Math.min(Math.max(selWeek - 1, 0), Math.max(weeks.length - 1, 0));
  const w = weeks[idx];

  let label: string;
  if (searchQuery) {
    label = `Résultats pour "${searchQuery}"`;
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
      className="mb-8 sm:mb-10 relative"
    >
      {backdropUrl && (
        <div className="hero-backdrop absolute -top-10 -left-10 -right-10 h-72 rounded-3xl overflow-hidden opacity-30 pointer-events-none">
          <img src={backdropUrl} alt="" className="w-full h-full object-cover blur-sm" />
          <div className="hero-backdrop-overlay absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/60 to-transparent" />
        </div>
      )}
      <div className="relative">
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-2">
          Sorties <span className="text-gradient">cinéma</span>
        </h1>
        <p className="text-white/40 text-base sm:text-lg font-light">{label}</p>
      </div>
    </motion.div>
  );
}
