export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 opacity-60">
          <div className="relative w-5 h-5 rounded-md overflow-hidden logo-shimmer flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white">
              <path d="M18.5 6.2a8.5 8.5 0 1 0 0 11.6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M13 10 L18.5 12 L13 14 Z" fill="currentColor" />
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
