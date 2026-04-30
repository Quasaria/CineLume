import { motion } from 'framer-motion';
import { useAppStore } from '@/store/appStore';

const MONTHS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

interface HeroProps {
  backdropUrl?: string;
}

export function Hero({ backdropUrl }: HeroProps) {
  const { selYear, selMonth, selWeek, searchQuery } = useAppStore();

  function getWeekDates() {
    const last = new Date(selYear, selMonth + 1, 0).getDate();
    const weeks = Math.ceil(last / 7);
    const start = (selWeek - 1) * 7 + 1;
    const end = selWeek === weeks ? last : selWeek * 7;
    return { start, end };
  }

  const dates = getWeekDates();
  const label = searchQuery
    ? `Résultats pour "${searchQuery}"`
    : `${dates.start}-${dates.end} ${MONTHS_FULL[selMonth]} ${selYear}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8 sm:mb-10 relative"
    >
      {backdropUrl && (
        <div className="absolute -top-10 -left-10 -right-10 h-72 rounded-3xl overflow-hidden opacity-30 pointer-events-none">
          <img src={backdropUrl} alt="" className="w-full h-full object-cover blur-sm" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/60 to-transparent" />
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
