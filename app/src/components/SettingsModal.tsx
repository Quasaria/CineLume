import { motion, AnimatePresence } from 'framer-motion';
import { Save, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/appStore';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export function SettingsModal() {
  const { isSettingsOpen, closeSettings, isDark, toggleTheme } = useAppStore();
  const [apiKey, setApiKey] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isSettingsOpen) {
      setApiKey(localStorage.getItem('tmdb_key') || '');
    }
  }, [isSettingsOpen]);

  function save() {
    const key = apiKey.trim();
    if (key) localStorage.setItem('tmdb_key', key);
    else localStorage.removeItem('tmdb_key');
    queryClient.invalidateQueries();
    closeSettings();
  }

  function clearCache() {
    localStorage.removeItem('cinelume_cache');
    localStorage.removeItem('genres_cache');
    closeSettings();
  }

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeSettings}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-[#0f0f15] rounded-3xl p-6 max-w-md w-full border border-white/10 shadow-2xl"
          >
            <h3 className="font-bold text-xl mb-6">Paramètres</h3>

            <div className="space-y-5">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider font-bold mb-2 block">
                  Clé API TMDB
                </label>
                <Input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Clé personnalisée..."
                  className="w-full bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm focus:border-violet-500/50 focus:ring-0"
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <div>
                  <p className="text-sm font-medium">{isDark ? 'Mode sombre' : 'Mode clair'}</p>
                  <p className="text-xs text-white/30">Basculer le thème</p>
                </div>
                <Switch checked={!isDark} onCheckedChange={toggleTheme} />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <div>
                  <p className="text-sm font-medium">Effacer le cache</p>
                  <p className="text-xs text-white/30">Supprimer les données locales</p>
                </div>
                <button
                  onClick={clearCache}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-3 h-3 inline mr-1" />
                  Effacer
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/5">
              <button
                onClick={closeSettings}
                className="px-4 py-2 rounded-xl text-white/50 hover:text-white text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={save}
                className="px-4 py-2 rounded-xl btn-primary text-white text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Sauvegarder
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
