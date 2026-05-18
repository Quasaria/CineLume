import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Heart, Sun, Moon, Settings } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Input } from '@/components/ui/input';

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M18.5 6.2a8.5 8.5 0 1 0 0 11.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M13 10 L18.5 12 L13 14 Z" fill="currentColor" />
    </svg>
  );
}

export function Navbar() {
  const { isDark, toggleTheme, openFavorites, openSettings, favorites, searchQuery, setSearchQuery } = useAppStore();
  const [scrolled, setScrolled] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const favCount = favorites.length;

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#050508]/85 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => {
            const store = useAppStore.getState();
            const n = new Date();
            store.setDate(n.getFullYear(), n.getMonth(), 1);
            store.setSearchQuery('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <motion.div
            whileHover={{ scale: 1.07, rotate: -4 }}
            whileTap={{ scale: 0.94 }}
            className="relative w-10 h-10 rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-lg shadow-violet-500/40"
          >
            <div className="logo-halo" />
            <div className="absolute inset-0 logo-shimmer" />
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center">
              <LogoMark className="w-[22px] h-[22px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
            </div>
          </motion.div>
          <span className="font-bold text-xl tracking-tight">
            Cine<span className="text-gradient">Lume</span>
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <div className="relative hidden sm:block">
            <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 lg:w-64 bg-white/5 border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-violet-500/50 focus:ring-0 focus:w-56 lg:focus:w-72 transition-all duration-300"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSearchVisible(!searchVisible)}
            className="sm:hidden p-2.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            <Search className="w-5 h-5 text-white/70" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openFavorites}
            className="p-2.5 rounded-xl hover:bg-white/5 transition-colors relative"
          >
            <Heart className="w-5 h-5 text-white/70" />
            {favCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {favCount}
              </span>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-white/70" />
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openSettings}
            className="p-2.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            <Settings className="w-5 h-5 text-white/70" />
          </motion.button>
        </div>
      </div>

      {searchVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="sm:hidden px-4 pb-3"
        >
          <div className="relative">
            <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Rechercher un film..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-500/50 focus:ring-0"
              autoFocus
            />
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
