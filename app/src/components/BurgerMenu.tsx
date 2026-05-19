import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Menu, Folder, Settings as SettingsIcon, X, Shuffle } from 'lucide-react';
import { toast } from 'sonner';
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
  const customListsCount = useAppStore((s) => s.customLists.length);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function pickRandom() {
    const state = useAppStore.getState();
    // Pool : watchlist en priorite (intent = a voir), favoris en fallback,
    // sinon toutes les listes custom additionnees.
    const pool = state.watchlist.length > 0
      ? state.watchlist
      : state.favorites.length > 0
        ? state.favorites
        : state.customLists.flatMap((l) => l.films);
    if (pool.length === 0) {
      toast.info(t('nav.surpriseEmpty'));
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    toast.success(t('nav.surpriseToast', { title: pick.title }), {
      duration: 5000,
      action: { label: t('nav.surpriseSeeOther'), onClick: () => pickRandom() },
    });
    state.openModal(pick.id);
  }

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
              onClick={() => handleItem(pickRandom)}
            />
            <MenuItem
              icon={Folder}
              label={t('nav.myLists')}
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

interface MenuItemProps {
  icon: typeof Folder;
  label: string;
  badge?: number;
  onClick: () => void;
}

function MenuItem({ icon: Icon, label, badge, onClick }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 active:bg-white/10 transition-colors text-sm font-medium text-white"
    >
      <Icon className="w-4 h-4 text-white/60 shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {badge !== undefined && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
          {badge}
        </span>
      )}
    </button>
  );
}
