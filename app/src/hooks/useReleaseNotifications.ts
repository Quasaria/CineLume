import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import { formatDateISO } from '@/lib/cinema-week';
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
  // On lit imperativement le store dans l'effet pour ne pas re-declencher
  // a chaque toggleFav (qui muterait l'array favorites). Sans ca, le
  // setTimeout 2500ms se voyait clear/replace en permanence -> notif jamais
  // affichee si l'user manipulait ses favoris au moment du load.
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const { favorites, openFavorites, notifQuietFrom, notifQuietTo } = useAppStore.getState();
    if (favorites.length === 0) return;

    // Heures de calme : si l'heure actuelle est dans la plage [from..to[,
    // on ne notifie pas. Supporte les plages qui chevauchent minuit
    // (ex: 22h-8h => from=1320, to=480).
    if (notifQuietFrom !== null && notifQuietTo !== null && notifQuietFrom !== notifQuietTo) {
      const now = new Date();
      const minute = now.getHours() * 60 + now.getMinutes();
      const inQuiet = notifQuietFrom < notifQuietTo
        ? minute >= notifQuietFrom && minute < notifQuietTo
        : minute >= notifQuietFrom || minute < notifQuietTo;
      if (inQuiet) return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    // formatDateISO compose YYYY-MM-DD depuis les composants locaux (vs
    // toISOString qui rend UTC). En soiree FR > 22h on tombait sur le
    // lendemain UTC, donc anti-spam casse.
    const todayKey = formatDateISO(today);
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

      try {
        localStorage.setItem('cinelume_notified_day', todayKey);
      } catch {
        // quota plein, tant pis on renotifiera demain
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);
}
