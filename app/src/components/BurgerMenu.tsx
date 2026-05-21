import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Menu, Folder, Settings as SettingsIcon, X, Shuffle, Layers, CalendarHeart, CalendarRange, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

/**
 * Bouton menu burger qui remplace l'ancienne roue crantee dans la navbar.
 * Au click, dropdown a droite contenant les entrees rangees (Mes listes,
 * Parametres). Fermeture par click outside, Escape ou click sur un item.
 */
export function BurgerMenu() {
  const { t } = useTranslation();
  const openLists = useAppStore((s) => s.openLists);
  const openSettings = useAppStore((s) => s.openSettings);
  const openPicker = useAppStore((s) => s.openPicker);
  const openSwipe = useAppStore((s) => s.openSwipe);
  const openWatchHistory = useAppStore((s) => s.openWatchHistory);
  const openYearCalendar = useAppStore((s) => s.openYearCalendar);
  const openWrapped = useAppStore((s) => s.openWrapped);
  const customListsCount = useAppStore((s) => s.customLists.length);
  const seenCount = useAppStore((s) => s.seen.length);
  // Dedup id : un film peut etre simultanement en favori ET en watchlist,
  // le badge doit refleter le nombre de films uniques suivis pour l'annee.
  const yearTrackedCount = useAppStore((s) => {
    const ids = new Set<number>();
    for (const f of s.favorites) ids.add(f.id);
    for (const w of s.watchlist) ids.add(w.id);
    return ids.size;
  });

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click outside ferme le menu
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function handleItem(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        aria-label={t('nav.menu')}
        aria-expanded={open}
        aria-haspopup="menu"
        className="min-w-11 min-h-11 flex items-center justify-center rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
      >
        {open ? (
          <X className="w-5 h-5 text-white/70" aria-hidden="true" />
        ) : (
          <Menu className="w-5 h-5 text-white/70" aria-hidden="true" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            role="menu"
            className="burger-menu absolute top-full right-0 mt-2 min-w-[220px] rounded-2xl border border-white/10 shadow-2xl shadow-black/40 overflow-hidden py-1.5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--surface) 98%, transparent)',
              backdropFilter: 'blur(20px) saturate(140%)',
              WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            }}
          >
            <MenuItem
              icon={Shuffle}
              label={t('nav.surprise')}
              description={t('nav.surpriseDesc')}
              onClick={() => handleItem(openPicker)}
              accent="violet"
            />
            <MenuItem
              icon={Layers}
              label={t('nav.swipe')}
              description={t('nav.swipeDesc')}
              onClick={() => handleItem(openSwipe)}
              accent="violet"
            />
            <MenuItem
              icon={CalendarHeart}
              label={t('nav.watchHistory')}
              description={t('nav.watchHistoryDesc')}
              badge={seenCount > 0 ? seenCount : undefined}
              onClick={() => handleItem(openWatchHistory)}
              accent="violet"
            />
            <MenuItem
              icon={CalendarRange}
              label={t('nav.yearCalendar')}
              description={t('nav.yearCalendarDesc')}
              badge={yearTrackedCount > 0 ? yearTrackedCount : undefined}
              onClick={() => handleItem(openYearCalendar)}
              accent="violet"
            />
            <WrappedMenuItem
              label={t('nav.wrapped')}
              description={t('nav.wrappedDesc')}
              onClick={() => handleItem(openWrapped)}
            />
            <MenuItem
              icon={Folder}
              label={t('nav.myLists')}
              description={t('nav.myListsDesc')}
              badge={customListsCount > 0 ? customListsCount : undefined}
              onClick={() => handleItem(openLists)}
            />
            <div className="h-px bg-white/[0.06] mx-2 my-1" aria-hidden="true" />
            <MenuItem
              icon={SettingsIcon}
              label={t('nav.settings')}
              onClick={() => handleItem(openSettings)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface WrappedMenuItemProps {
  label: string;
  description: string;
  onClick: () => void;
}

function WrappedMenuItem({ label, description, onClick }: WrappedMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full mx-1.5 my-1 px-3 py-2.5 rounded-xl text-left transition-all border border-white/10 hover:border-white/20 active:scale-[0.98]"
      style={{
        width: 'calc(100% - 12px)',
        background:
          'linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(217, 70, 239, 0.18) 50%, rgba(6, 182, 212, 0.22) 100%)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-violet-500/60 to-fuchsia-500/60 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <Sparkles className="w-4.5 h-4.5 text-white" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white tracking-tight">
            <span className="bg-gradient-to-r from-violet-100 via-fuchsia-100 to-cyan-100 bg-clip-text text-transparent">
              {label}
            </span>
          </p>
          <p className="text-[11px] text-white/65 leading-tight truncate mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  );
}

interface MenuItemProps {
  icon: typeof Folder;
  label: string;
  description?: string;
  badge?: number;
  accent?: 'violet' | 'default';
  onClick: () => void;
}

function MenuItem({ icon: Icon, label, description, badge, accent = 'default', onClick }: MenuItemProps) {
  const iconClass = accent === 'violet' ? 'text-violet-400' : 'text-white/60';
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 active:bg-white/10 transition-colors text-white"
    >
      <Icon className={`w-5 h-5 shrink-0 ${iconClass}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{label}</p>
        {description && (
          <p className="text-[11px] text-white/50 leading-tight truncate">{description}</p>
        )}
      </div>
      {badge !== undefined && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
          {badge}
        </span>
      )}
    </button>
  );
}
