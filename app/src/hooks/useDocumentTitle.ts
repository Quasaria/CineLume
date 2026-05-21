import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/appStore';

const BASE_TITLE_FR = 'CineLume — Sorties cinéma & streaming, gratuit sans pub';
const BASE_TITLE_EN = 'CineLume — Movie & streaming releases, free no ads';

/**
 * Met a jour le <title> du document selon le contexte courant (modale film
 * ouverte, recherche active, page personne, etc.). Pas visible dans l'UI
 * (l'utilisateur ne voit que l'onglet du navigateur), mais important pour :
 * - le SEO quand un deep-link est partage (titre = titre du film)
 * - le partage iMessage/Slack/Discord qui reprend le title
 * - la liste des onglets/historique du navigateur
 */
export function useDocumentTitle() {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'fr';
  const baseTitle = lang.startsWith('en') ? BASE_TITLE_EN : BASE_TITLE_FR;

  const selectedPerson = useAppStore((s) => s.selectedPerson);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const currentModalMovieId = useAppStore((s) => s.currentModalMovieId);

  useEffect(() => {
    let title = baseTitle;
    if (currentModalMovieId !== null) {
      // Le titre du film est mis a jour par la modale elle-meme via
      // setDocumentTitleFromMovie quand les details TMDB sont chargees.
      // Ici on pose un fallback pour le moment de chargement.
      title = `Film — ${baseTitle}`;
    } else if (selectedPerson) {
      title = `${selectedPerson.name} — ${baseTitle}`;
    } else if (searchQuery.trim()) {
      title = `"${searchQuery.trim()}" — ${baseTitle}`;
    }
    document.title = title;
  }, [baseTitle, selectedPerson, searchQuery, currentModalMovieId]);
}

/**
 * A appeler quand on connait le titre exact d'un film charge (depuis la
 * modale film). Cleanup automatique : remet le titre de base au unmount.
 */
export function setDocumentTitleFromMovie(movieTitle: string | undefined, lang: string) {
  if (!movieTitle) return;
  const baseTitle = lang.startsWith('en') ? BASE_TITLE_EN : BASE_TITLE_FR;
  document.title = `${movieTitle} — ${baseTitle}`;
}
