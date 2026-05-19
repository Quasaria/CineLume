import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import i18n from '@/i18n';

function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const parts = s.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

/**
 * A l'ouverture de l'app, scanne les favoris et avertit l'user des sorties
 * imminentes (7 jours a venir). Un toast est toujours affiche (Sonner) ; en
 * plus, si l'user a autorise les notifications natives navigateur, on
 * declenche une Notification() pour que ca passe sur l'OS.
 *
 * Anti-spam : trace le dernier jour ou on a notifie dans localStorage. Une
 * seule notification par jour, peu importe combien de fois l'app est rouverte.
 *
 * Pas de vrai push backend ici : sans serveur on ne peut pas notifier quand
 * l'app est fermee. C'est un rappel "a l'ouverture" qui suffit pour une app
 * statique GitHub Pages.
 */
export function useReleaseNotifications() {
  const favorites = useAppStore((s) => s.favorites);
  const openFavorites = useAppStore((s) => s.openFavorites);

  useEffect(() => {
    if (favorites.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    const todayKey = today.toISOString().split('T')[0];
    const lastNotifiedDay = localStorage.getItem('cinelume_notified_day');
    if (lastNotifiedDay === todayKey) return;

    const upcoming = favorites.filter((f) => {
      if (!f.release_date) return false;
      const d = parseLocalDate(f.release_date);
      return d !== null && d >= today && d <= weekEnd;
    });

    if (upcoming.length === 0) return;

    // Anti-jarring : on laisse l'UI se monter avant de balancer le toast.
    const timer = setTimeout(() => {
      const title = upcoming.length === 1
        ? i18n.t('notifications.singleTitle', { title: upcoming[0].title })
        : i18n.t('notifications.multiTitle', { count: upcoming.length });
      const body = upcoming.slice(0, 4).map((f) => f.title).join(' · ');

      toast(title, {
        description: body,
        duration: 6000,
        action: {
          label: i18n.t('notifications.view'),
          onClick: () => openFavorites(),
        },
      });

      // Notification OS optionnelle : seulement si l'user a explicitement
      // donne la permission. On ne demande PAS ici (c'est le role de
      // SettingsModal apres un click user).
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: `${import.meta.env.BASE_URL || '/'}icon.svg`,
            tag: 'cinelume-weekly-favs',
            silent: false,
          });
        } catch {
          // certains navigateurs jettent si appele hors contexte secure
          // ou sans gesture user, on ignore
        }
      }

      localStorage.setItem('cinelume_notified_day', todayKey);
    }, 2500);

    return () => clearTimeout(timer);
  }, [favorites, openFavorites]);
}
