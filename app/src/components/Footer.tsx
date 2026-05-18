export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 opacity-60">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-500 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="3.5 1.5" strokeLinecap="round" />
              <path d="M10 8.5 L16 12 L10 15.5 Z" fill="currentColor" />
            </svg>
          </div>
          <span className="font-bold text-white/80">CineLume</span>
          <span className="text-white/30 text-xs">© 2026</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/20">
          <span>Données</span>
          <img
            src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
            alt="TMDB"
            className="h-2.5 opacity-50"
          />
        </div>
      </div>
    </footer>
  );
}
