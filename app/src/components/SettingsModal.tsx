import { motion, AnimatePresence } from 'framer-motion';
import { Save, Trash2, Globe, Bell, Download, Upload, FileDown, Palette, Database, BarChart3, Sparkles, ChevronDown, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useDragToClose } from '@/hooks/useDragToClose';
import { useFocusRestore } from '@/hooks/useFocusRestore';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { invalidateApiKeyCache } from '@/lib/tmdb';
import { parseLetterboxdCSV, importFromLetterboxd, exportToLetterboxdCSV } from '@/lib/letterboxd';
import { computeUserStats } from '@/lib/userStats';
import { computeCacheStats, formatBytes } from '@/lib/cacheStats';
import type { SupportedLang } from '@/i18n';

const LANG_LABEL: Record<SupportedLang, string> = {
  fr: 'Français',
  en: 'English',
};

// Card de section : titre + icone + contenu. Donne une vraie hierarchie
// visuelle au lieu d'une longue liste plate de toggles separes par des
// border-t. L'icone aide a scanner rapidement la section recherchee.
function SectionCard({ icon: Icon, title, children }: { icon: typeof Bell; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
      <h3 className="flex items-center gap-2 px-4 pt-3.5 pb-2 text-[11px] font-bold text-white/55 uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        {title}
      </h3>
      <div className="px-4 pb-3 space-y-2.5">{children}</div>
    </section>
  );
}

// Ligne dans une section : label + description optionnelle + slot droit.
function SettingRow({ label, description, right }: { label: ReactNode; description?: ReactNode; right: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-white/50 leading-tight mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: 'violet' | 'cyan' | 'fuchsia' | 'emerald' }) {
  const styles: Record<typeof accent, string> = {
    violet: 'border-violet-500/20 bg-violet-500/[0.06] text-violet-300',
    cyan: 'border-cyan-500/20 bg-cyan-500/[0.06] text-cyan-300',
    fuchsia: 'border-fuchsia-500/20 bg-fuchsia-500/[0.06] text-fuchsia-300',
    emerald: 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300',
  };
  return (
    <div className={`p-3 rounded-xl border ${styles[accent]}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] uppercase tracking-wider opacity-80 leading-tight">{label}</p>
    </div>
  );
}

export function SettingsModal() {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const isSettingsOpen = useAppStore((s) => s.isSettingsOpen);
  const closeSettings = useAppStore((s) => s.closeSettings);
  const isDark = useAppStore((s) => s.isDark);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const blindMode = useAppStore((s) => s.blindMode);
  const toggleBlindMode = useAppStore((s) => s.toggleBlindMode);
  const markSeenInGrid = useAppStore((s) => s.markSeenInGrid);
  const toggleMarkSeenInGrid = useAppStore((s) => s.toggleMarkSeenInGrid);
  const favorites = useAppStore((s) => s.favorites);
  const watchlist = useAppStore((s) => s.watchlist);
  const customLists = useAppStore((s) => s.customLists);
  const notifQuietFrom = useAppStore((s) => s.notifQuietFrom);
  const notifQuietTo = useAppStore((s) => s.notifQuietTo);
  const setNotifQuiet = useAppStore((s) => s.setNotifQuiet);

  const [apiKey, setApiKey] = useState('');
  const [apiKeyExpanded, setApiKeyExpanded] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  );
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<Array<{ name: string; reason: 'no-match' | 'error' }>>([]);
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragHandlers = useDragToClose({ onClose: closeSettings, contentRef });
  const { canInstall, isInstalled, install } = useInstallPrompt();
  useBodyScrollLock(isSettingsOpen);
  useFocusRestore(isSettingsOpen);
  useSwipeBack({ onBack: closeSettings, enabled: isSettingsOpen });

  const currentLang = (i18n.language || 'fr').split('-')[0] as SupportedLang;
  const stats = computeUserStats(favorites, watchlist, customLists);
  const [cacheStatsState, setCacheStatsState] = useState({ bytes: 0, entries: 0 });

  useEffect(() => {
    if (isSettingsOpen) {
      setApiKey(localStorage.getItem('tmdb_key') || '');
      if (typeof Notification !== 'undefined') {
        setNotifPermission(Notification.permission);
      }
      setCacheStatsState(computeCacheStats());
    } else {
      setApiKeyExpanded(false);
    }
  }, [isSettingsOpen]);

  async function toggleNotifications() {
    if (typeof Notification === 'undefined') {
      toast.info(t('settings.notificationsUnsupported'));
      return;
    }
    if (Notification.permission === 'granted') {
      toast.info(t('settings.notificationsRevokeHint'));
      return;
    }
    if (Notification.permission === 'denied') {
      toast.info(t('settings.notificationsBlockedHint'));
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      if (result === 'granted') {
        toast.success(t('settings.notificationsEnabled'));
        try {
          new Notification(t('settings.notificationsTestTitle'), {
            body: t('settings.notificationsTestBody'),
            icon: `${import.meta.env.BASE_URL || '/'}icon.svg`,
            tag: 'cinelume-test',
          });
        } catch {
          // ignore
        }
      }
    } catch {
      toast.error(t('settings.notificationsError'));
    }
  }

  async function handleInstall() {
    const accepted = await install();
    if (accepted) {
      toast.success(t('settings.installed'));
      closeSettings();
    }
  }

  async function handleLetterboxdImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      toast.error(t('settings.lbImportReadError'));
      return;
    }

    const rows = parseLetterboxdCSV(text);
    if (rows.length === 0) {
      toast.error(t('settings.lbImportEmpty'));
      return;
    }

    setImporting(true);
    const toastId = 'letterboxd-import';
    toast.loading(t('settings.lbImportProgress', { current: 0, total: rows.length, title: rows[0]?.name || '' }), { id: toastId });

    try {
      const result = await importFromLetterboxd(rows, {
        onProgress: (current, total, currentTitle) => {
          toast.loading(t('settings.lbImportProgress', { current, total, title: currentTitle }), { id: toastId });
        },
      });

      const existing = useAppStore.getState().watchlist;
      const existingIds = new Set(existing.map((f) => f.id));
      const newOnes = result.imported.filter((m) => !existingIds.has(m.id));
      const merged = [...existing, ...newOnes];
      try {
        localStorage.setItem('cinelume_watchlist', JSON.stringify(merged));
      } catch {
        // ignore quota
      }
      useAppStore.setState({ watchlist: merged });

      // Affiche un report detaille avec les skipped si la liste est petite,
      // sinon juste un compteur. L'user peut consulter le report en
      // memoire (state) tant que la modale est ouverte.
      setImportReport(result.skipped);
      toast.success(
        t('settings.lbImportDone', { added: newOnes.length, skipped: result.skipped.length }),
        { id: toastId, duration: 6000 },
      );
    } catch {
      toast.error(t('settings.lbImportError'), { id: toastId });
    } finally {
      setImporting(false);
    }
  }

  function handleLetterboxdExport() {
    const watchlist = useAppStore.getState().watchlist;
    const favorites = useAppStore.getState().favorites;
    const seen = new Set<number>();
    const merged = [...watchlist, ...favorites].filter((f) => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
    if (merged.length === 0) {
      toast.error(t('settings.lbExportEmpty'));
      return;
    }
    const csv = exportToLetterboxdCSV(merged);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cinelume-letterboxd-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 200);
    toast.success(t('settings.lbExportDone', { count: merged.length }));
  }

  function saveApiKey() {
    const key = apiKey.trim();
    if (key) {
      localStorage.setItem('tmdb_key', key);
      toast.success(t('settings.keySaved'));
    } else {
      localStorage.removeItem('tmdb_key');
      toast.success(t('settings.keyReset'));
    }
    invalidateApiKeyCache();
    queryClient.invalidateQueries();
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
    setCacheStatsState({ bytes: 0, entries: 0 });
    toast.success(removed > 0 ? t('settings.cacheCleared', { count: removed }) : t('settings.cacheEmpty'));
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
          className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeSettings}
          />
          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            className="relative bg-[#0f0f15] rounded-t-3xl md:rounded-3xl max-w-lg w-full max-h-[92dvh] md:max-h-[88vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col"
            {...dragHandlers}
          >
            <div className="w-12 h-1.5 rounded-full bg-white/30 mx-auto mt-3 md:hidden shrink-0" aria-hidden="true" />

            <div ref={contentRef} className="overflow-y-auto overscroll-contain px-5 pt-3 pb-6 md:p-6 flex-1">
              <ModalHeader
                title={t('settings.title')}
                onBack={closeSettings}
                titleId="settings-modal-title"
              />

              <div className="space-y-3">
                {/* Preferences */}
                <SectionCard icon={Palette} title={t('settings.title')}>
                  <SettingRow
                    label={t('settings.language')}
                    description={t('settings.languageDesc')}
                    right={
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
                    }
                  />
                  <SettingRow
                    label={isDark ? t('settings.themeDark') : t('settings.themeLight')}
                    description={t('settings.themeToggleDesc')}
                    right={<Switch checked={!isDark} onCheckedChange={toggleTheme} aria-label={t('settings.themeToggleDesc')} />}
                  />
                  <SettingRow
                    label={t('settings.blindMode')}
                    description={t('settings.blindModeDesc')}
                    right={<Switch checked={blindMode} onCheckedChange={toggleBlindMode} aria-label={t('settings.blindMode')} />}
                  />
                  <SettingRow
                    label={t('settings.markSeenInGrid')}
                    description={t('settings.markSeenInGridDesc')}
                    right={<Switch checked={markSeenInGrid} onCheckedChange={toggleMarkSeenInGrid} aria-label={t('settings.markSeenInGrid')} />}
                  />
                </SectionCard>

                {/* Notifications */}
                <SectionCard icon={Bell} title={t('settings.notifications')}>
                  <SettingRow
                    label={t('settings.notifications')}
                    description={
                      notifPermission === 'granted'
                        ? t('settings.notificationsGranted')
                        : notifPermission === 'denied'
                          ? t('settings.notificationsDenied')
                          : notifPermission === 'unsupported'
                            ? t('settings.notificationsUnsupported')
                            : t('settings.notificationsDesc')
                    }
                    right={
                      <button
                        type="button"
                        onClick={toggleNotifications}
                        disabled={notifPermission === 'unsupported'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          notifPermission === 'granted'
                            ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                            : notifPermission === 'denied'
                              ? 'bg-white/5 text-white/40 border border-white/10 cursor-help'
                              : 'bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 border border-violet-500/30'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {notifPermission === 'granted'
                          ? t('settings.notificationsOn')
                          : notifPermission === 'denied'
                            ? t('settings.notificationsBlocked')
                            : t('settings.notificationsEnable')}
                      </button>
                    }
                  />
                  {notifPermission === 'granted' && (
                    <QuietHoursRow
                      from={notifQuietFrom}
                      to={notifQuietTo}
                      onChange={setNotifQuiet}
                      t={t}
                    />
                  )}
                </SectionCard>

                {/* Mes statistiques */}
                {stats.totalTracked > 0 && (
                  <SectionCard icon={BarChart3} title={t('settings.statsTitle')}>
                    <div className="grid grid-cols-2 gap-2 -mt-1">
                      <StatCard label={t('settings.statsTracked')} value={String(stats.totalTracked)} accent="violet" />
                      <StatCard label={t('settings.statsThisWeek')} value={String(stats.thisWeek)} accent="cyan" />
                      <StatCard label={t('settings.statsUpcomingMonth')} value={String(stats.upcomingThisMonth)} accent="fuchsia" />
                      <StatCard label={t('settings.statsLists')} value={String(stats.customListsCount)} accent="emerald" />
                    </div>
                    {stats.nextUpcoming && (
                      <p className="text-xs text-white/60 pt-2">
                        <span className="text-white/45">{t('settings.statsNext')}</span>{' '}
                        <span className="text-white font-semibold">{stats.nextUpcoming.title}</span>
                      </p>
                    )}
                  </SectionCard>
                )}

                {/* Donnees : import/export Letterboxd + clear cache */}
                <SectionCard icon={Database} title="Letterboxd">
                  <p className="text-[11px] text-white/45 leading-snug -mt-1">{t('settings.lbHint')}</p>
                  <div className="flex gap-2 flex-wrap pt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleLetterboxdImport}
                      className="hidden"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      disabled={importing}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 min-h-11 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white text-xs font-semibold transition-colors border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      {importing ? t('settings.lbImporting') : t('settings.lbImport')}
                    </button>
                    <button
                      type="button"
                      onClick={handleLetterboxdExport}
                      className="flex-1 min-w-0 flex items-center justify-center gap-1.5 px-3 py-2 min-h-11 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white text-xs font-semibold transition-colors border border-white/10"
                    >
                      <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
                      {t('settings.lbExport')}
                    </button>
                  </div>

                  {/* Rapport detaille : films skippes apres un import. Liste
                      scrollable, max 200px. Marquage de la raison (no-match
                      vs erreur) pour aider l'user a comprendre. */}
                  {importReport.length > 0 && (
                    <div className="mt-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/20 p-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                          {t('settings.lbReportSkipped', { count: importReport.length })}
                        </p>
                        <button
                          type="button"
                          onClick={() => setImportReport([])}
                          aria-label={t('common.close')}
                          className="text-amber-300/70 hover:text-amber-300 text-xs"
                        >
                          <X className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                      <ul className="max-h-[200px] overflow-y-auto space-y-0.5 -mr-1 pr-1">
                        {importReport.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] leading-tight">
                            <span className={`shrink-0 text-[9px] uppercase tracking-wider font-bold mt-0.5 ${s.reason === 'no-match' ? 'text-amber-400/80' : 'text-red-400/80'}`}>
                              {s.reason === 'no-match' ? t('settings.lbReportNoMatch') : t('settings.lbReportError')}
                            </span>
                            <span className="text-white/75 truncate">{s.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <SettingRow
                    label={t('settings.clearCache')}
                    description={cacheStatsState.entries > 0
                      ? t('settings.cacheSize', { size: formatBytes(cacheStatsState.bytes) })
                      : t('settings.clearCacheDesc')}
                    right={
                      <button
                        type="button"
                        onClick={clearCache}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                        {t('common.clear')}
                      </button>
                    }
                  />
                </SectionCard>

                {/* Application */}
                {canInstall && !isInstalled && (
                  <SectionCard icon={Sparkles} title={t('settings.installApp')}>
                    <SettingRow
                      label={t('settings.installApp')}
                      description={t('settings.installAppDesc')}
                      right={
                        <button
                          type="button"
                          onClick={handleInstall}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-bold hover:bg-cyan-500/25 transition-colors flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" aria-hidden="true" />
                          {t('settings.install')}
                        </button>
                      }
                    />
                  </SectionCard>
                )}

                {/* API TMDB : avance, collapsable pour ne pas encombrer */}
                <section className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setApiKeyExpanded((v) => !v)}
                    aria-expanded={apiKeyExpanded}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="flex items-center gap-2 text-[11px] font-bold text-white/55 uppercase tracking-wider">
                      <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                      {t('settings.apiKey')}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${apiKeyExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  {apiKeyExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      <Input
                        id="settings-apikey"
                        type="password"
                        autoComplete="off"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={t('settings.apiKeyPlaceholder')}
                        className="w-full bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm focus:border-violet-500/50 focus:ring-0"
                      />
                      <button
                        type="button"
                        onClick={saveApiKey}
                        className="w-full min-h-11 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" aria-hidden="true" />
                        {t('common.save')}
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


function pad2(n: number) { return n.toString().padStart(2, "0"); }
function minToTimeStr(m: number) { return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`; }
function timeStrToMin(s: string): number | null {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

interface QuietHoursRowProps {
  from: number | null;
  to: number | null;
  onChange: (from: number | null, to: number | null) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function QuietHoursRow({ from, to, onChange, t }: QuietHoursRowProps) {
  const active = from !== null && to !== null && from !== to;
  const fromStr = from !== null ? minToTimeStr(from) : "22:00";
  const toStr = to !== null ? minToTimeStr(to) : "08:00";
  return (
    <div className="border-t border-white/[0.06] mt-1 pt-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">{t("settings.notifQuiet")}</p>
          <p className="text-xs text-white/50 leading-tight">{t("settings.notifQuietDesc")}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (active) onChange(null, null);
            else onChange(22 * 60, 8 * 60);
          }}
          aria-pressed={active}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            active
              ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
              : "bg-white/5 text-white/55 border border-white/10 hover:bg-white/10"
          }`}
        >
          {active ? t("settings.notificationsOn") : t("settings.notifQuietOff")}
        </button>
      </div>
      {active && (
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1.5 text-white/70">
            <span className="text-xs text-white/45">{t("settings.notifQuietFrom")}</span>
            <input
              type="time"
              value={fromStr}
              onChange={(e) => {
                const m = timeStrToMin(e.target.value);
                // Si l'user fixe from = to, on bump to de +1 min pour
                // garantir une plage non-vide (sinon la verif store
                // notifQuietFrom !== notifQuietTo desactive le calme).
                if (m !== null) onChange(m, m === to ? (m + 1) % 1440 : to);
              }}
              className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-base md:text-sm text-white tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            />
          </label>
          <label className="flex items-center gap-1.5 text-white/70">
            <span className="text-xs text-white/45">{t("settings.notifQuietTo")}</span>
            <input
              type="time"
              value={toStr}
              onChange={(e) => {
                const m = timeStrToMin(e.target.value);
                if (m !== null) onChange(m === from ? (from + 1439) % 1440 : from, m);
              }}
              className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-base md:text-sm text-white tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            />
          </label>
        </div>
      )}
    </div>
  );
}
