import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

const VISITS_KEY = 'cinelume_visits';
const DISMISSED_KEY = 'cinelume_pwa_banner_dismissed_at';
const MIN_VISITS = 3;
const DISMISS_COOLDOWN_DAYS = 30;

function getStoredNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Banner discret en bas de page qui suggere d'installer la PWA. S'affiche
 * apres MIN_VISITS visites (pour ne pas spammer le nouvel user), uniquement
 * si la PWA est installable et pas deja installee, et si l'user ne l'a pas
 * deja ferme dans les DISMISS_COOLDOWN_DAYS derniers jours.
 *
 * Le compteur de visites s'incremente au mount (1 increment par chargement
 * de l'app, pas par render).
 */
export function PwaInstallBanner() {
  const { t } = useTranslation();
  const { canInstall, isInstalled, install } = useInstallPrompt();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Increment du compteur de visites au 1er mount.
    const visits = getStoredNumber(VISITS_KEY, 0) + 1;
    try {
      localStorage.setItem(VISITS_KEY, String(visits));
    } catch {
      // ignore quota
    }

    // Verifie si on est dans la cooldown post-dismiss.
    const dismissedAt = getStoredNumber(DISMISSED_KEY, 0);
    const daysSinceDismiss = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    const dismissedRecently = dismissedAt > 0 && daysSinceDismiss < DISMISS_COOLDOWN_DAYS;

    if (visits >= MIN_VISITS && !dismissedRecently) {
      // Petit delai pour ne pas balancer la banner sur le LCP initial.
      const timer = setTimeout(() => setVisible(true), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Cache la banner si la PWA n'est pas installable ou si elle est deja
  // installee (changes peuvent arriver pendant la session).
  useEffect(() => {
    if (isInstalled || !canInstall) setVisible(false);
  }, [isInstalled, canInstall]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setVisible(false);
  }

  async function handleInstall() {
    const accepted = await install();
    if (accepted) {
      toast.success(t('settings.installed'));
      setVisible(false);
    }
  }

  return (
    <AnimatePresence>
      {visible && canInstall && !isInstalled && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-label={t('settings.pwaBannerTitle')}
          className="fixed left-4 right-4 z-40 max-w-md mx-auto rounded-2xl border border-cyan-500/30 shadow-2xl shadow-black/40 overflow-hidden"
          style={{
            bottom: 'max(env(safe-area-inset-bottom), 16px)',
            backgroundColor: 'color-mix(in srgb, var(--surface) 96%, transparent)',
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          }}
        >
          <div className="flex items-start gap-3 p-3.5">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <Download className="w-5 h-5 text-cyan-300" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight">{t('settings.pwaBannerTitle')}</p>
              <p className="text-xs text-white/60 leading-snug mt-0.5">{t('settings.pwaBannerDesc')}</p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t('common.close')}
              className="shrink-0 -mr-1 min-w-9 min-h-9 flex items-center justify-center rounded-lg text-white/45 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex gap-2 px-3 pb-3">
            <button
              type="button"
              onClick={dismiss}
              className="flex-1 min-h-11 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              {t('settings.pwaBannerLater')}
            </button>
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 min-h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-bold flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              {t('settings.pwaBannerInstall')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
