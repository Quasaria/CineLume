import { motion, AnimatePresence } from 'framer-motion';
import { Save, Trash2, Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useDragToClose } from '@/hooks/useDragToClose';
import type { SupportedLang } from '@/i18n';

const LANG_LABEL: Record<SupportedLang, string> = {
  fr: 'Français',
  en: 'English',
};

export function SettingsModal() {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const { isSettingsOpen, closeSettings, isDark, toggleTheme } = useAppStore();
  const [apiKey, setApiKey] = useState('');
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);
  const dragHandlers = useDragToClose({ onClose: closeSettings, contentRef });
  useBodyScrollLock(isSettingsOpen);

  const currentLang = (i18n.language || 'fr').split('-')[0] as SupportedLang;

  useEffect(() => {
    if (isSettingsOpen) {
      setApiKey(localStorage.getItem('tmdb_key') || '');
    }
  }, [isSettingsOpen]);

  function save() {
    const key = apiKey.trim();
    if (key) {
      localStorage.setItem('tmdb_key', key);
      toast.success(t('settings.keySaved'));
    } else {
      localStorage.removeItem('tmdb_key');
      toast.success(t('settings.keyReset'));
    }
    queryClient.invalidateQueries();
    closeSettings();
  }

  function clearCache() {
    let removed = 0;
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('md_') || key.startsWith('rd_') || key.startsWith('genres_cache') || key === 'cinelume_cache') {
        localStorage.removeItem(key);
        removed++;
      }
    });
    queryClient.invalidateQueries();
    toast.success(removed > 0 ? t('settings.cacheCleared', { count: removed }) : t('settings.cacheEmpty'));
    closeSettings();
  }

  function changeLang(lng: SupportedLang) {
    i18n.changeLanguage(lng);
    queryClient.invalidateQueries();
  }

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeSettings}
          />
          <motion.div
            ref={contentRef}
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-[#0f0f15] rounded-t-3xl sm:rounded-3xl px-5 pt-3 pb-6 sm:p-6 max-w-md w-full max-h-[90vh] sm:max-h-none overflow-y-auto overscroll-contain border border-white/10 shadow-2xl"
            {...dragHandlers}
          >
            <div className="w-12 h-1.5 rounded-full bg-white/30 mx-auto mb-3 sm:hidden" aria-hidden="true" />
            <h3 className="font-bold text-xl mb-6">{t('settings.title')}</h3>

            <div className="space-y-5">
              <div>
                <label htmlFor="settings-apikey" className="text-xs text-white/50 uppercase tracking-wider font-bold mb-2 block">
                  {t('settings.apiKey')}
                </label>
                <Input
                  id="settings-apikey"
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t('settings.apiKeyPlaceholder')}
                  className="w-full bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm focus:border-violet-500/50 focus:ring-0"
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-white/60" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium">{t('settings.language')}</p>
                    <p className="text-xs text-white/50">{t('settings.languageDesc')}</p>
                  </div>
                </div>
                <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10" role="group" aria-label={t('settings.language')}>
                  {(['fr', 'en'] as const).map((lng) => (
                    <button
                      key={lng}
                      type="button"
                      onClick={() => changeLang(lng)}
                      aria-pressed={currentLang === lng}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        currentLang === lng ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {LANG_LABEL[lng]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <div>
                  <p className="text-sm font-medium">{isDark ? t('settings.themeDark') : t('settings.themeLight')}</p>
                  <p className="text-xs text-white/50">{t('settings.themeToggleDesc')}</p>
                </div>
                <Switch checked={!isDark} onCheckedChange={toggleTheme} aria-label={t('settings.themeToggleDesc')} />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <div>
                  <p className="text-sm font-medium">{t('settings.clearCache')}</p>
                  <p className="text-xs text-white/50">{t('settings.clearCacheDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={clearCache}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-3 h-3 inline mr-1" aria-hidden="true" />
                  {t('common.clear')}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={closeSettings}
                className="px-4 py-2 rounded-xl text-white/60 hover:text-white text-sm font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={save}
                className="px-4 py-2 rounded-xl btn-primary text-white text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 flex items-center gap-2"
              >
                <Save className="w-4 h-4" aria-hidden="true" />
                {t('common.save')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
