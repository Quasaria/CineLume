import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Intercepte le `beforeinstallprompt` que Chrome/Edge dispatchent avant
 * de proposer leur banner natif. On le memorise pour le rejouer plus tard
 * quand l'user clique sur notre propre bouton "Installer".
 *
 * Detection PWA installee via display-mode: standalone (matchMedia) +
 * event `appinstalled`. canInstall = on a un event en attente ET pas
 * deja installe.
 */
export function useInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detection initiale : si l'app tourne deja en mode standalone
    // (utilisateur ouvre depuis l'icone home screen), elle est installee.
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      // Empeche le banner natif. On affichera notre propre prompt.
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function install(): Promise<boolean> {
    if (!installEvent) return false;
    try {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      // Per spec, le prompt event ne peut etre utilise qu'une fois (que
      // l'user accepte ou refuse). On reset dans les deux cas pour eviter
      // de garder "Installer" actif avec un event consume.
      setInstallEvent(null);
      return outcome === 'accepted';
    } catch {
      setInstallEvent(null);
      return false;
    }
  }

  return {
    canInstall: !!installEvent && !isInstalled,
    isInstalled,
    install,
  };
}
