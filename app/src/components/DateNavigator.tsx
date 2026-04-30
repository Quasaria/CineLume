import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export function DateNavigator() {
  const { selYear, selMonth, selWeek, setDate } = useAppStore();
  const now = new Date();
  const MIN_YEAR = now.getFullYear() - 1;
  const MAX_YEAR = now.getFullYear() + 2;

  function getWeeksInMonth(y: number, m: number) {
    const last = new Date(y, m + 1, 0).getDate();
    return Math.ceil(last / 7);
  }

  const weeks = getWeeksInMonth(selYear, selMonth);

  return (
    <div className="flex items-center gap-3 mb-6 overflow-x-auto no-scrollbar pb-1">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => selYear > MIN_YEAR && setDate(selYear - 1, selMonth, 1)}
        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors shrink-0"
      >
        <ChevronLeft className="w-4 h-4 text-white/60" />
      </motion.button>

      <span className="font-bold text-lg tabular-nums w-12 text-center shrink-0">
        {selYear}
      </span>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => selYear < MAX_YEAR && setDate(selYear + 1, selMonth, 1)}
        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors shrink-0"
      >
        <ChevronRight className="w-4 h-4 text-white/60" />
      </motion.button>

      <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {MONTHS.map((m, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDate(selYear, i, 1)}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              i === selMonth
                ? 'bg-white text-black'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            {m}
          </motion.button>
        ))}
      </div>

      <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

      <div className="flex gap-1">
        {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
          <motion.button
            key={w}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDate(selYear, selMonth, w)}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              w === selWeek
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            S{w}
          </motion.button>
        ))}
      </div>

      <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          const n = new Date();
          setDate(n.getFullYear(), n.getMonth(), 1);
        }}
        className="ml-auto shrink-0 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-300 text-xs font-semibold hover:bg-violet-500/20 transition-colors border border-violet-500/20 flex items-center gap-1.5"
      >
        <Calendar className="w-3 h-3" />
        Aujourd'hui
      </motion.button>
    </div>
  );
}
