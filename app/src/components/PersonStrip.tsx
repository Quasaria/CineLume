import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { PROF, profileSrcSet } from '@/lib/tmdb';
import type { PersonSearchResult } from '@/lib/tmdb';

interface PersonStripProps {
  persons: PersonSearchResult[];
}

export function PersonStrip({ persons }: PersonStripProps) {
  const { t } = useTranslation();
  const setSelectedPerson = useAppStore((s) => s.setSelectedPerson);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);

  function pickPerson(p: PersonSearchResult) {
    setSelectedPerson({ id: p.id, name: p.name });
    setSearchQuery('');
  }

  return (
    <section className="mb-6" aria-label={t('persons.title')}>
      <h2 className="flex items-center gap-2 text-xs font-bold text-white/60 uppercase tracking-wider mb-3">
        <Users className="w-3.5 h-3.5" aria-hidden="true" />
        {t('persons.title')}
        <span className="text-white/40 normal-case tracking-normal font-medium">({persons.length})</span>
      </h2>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        {persons.map((p, i) => (
          <motion.button
            key={p.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => pickPerson(p)}
            aria-label={t('persons.viewFilmography', { name: p.name })}
            className="shrink-0 w-[110px] flex flex-col items-center text-center group bg-transparent border-0 p-0"
          >
            <div className="w-[88px] h-[88px] rounded-full overflow-hidden bg-white/5 border border-white/10 group-hover:border-violet-500/60 group-hover:shadow-lg group-hover:shadow-violet-500/30 transition-all">
              {p.profile_path ? (
                <img
                  src={`${PROF}${p.profile_path}`}
                  srcSet={profileSrcSet(p.profile_path)}
                  sizes="88px"
                  alt={p.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-white/30" aria-hidden="true" />
                </div>
              )}
            </div>
            <p className="mt-2 text-xs font-semibold text-white truncate w-full leading-tight group-hover:text-violet-300 transition-colors">
              {p.name}
            </p>
            <p className="text-[10px] text-white/60 truncate w-full">
              {t(`persons.department.${p.known_for_department}`, { defaultValue: p.known_for_department })}
            </p>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
