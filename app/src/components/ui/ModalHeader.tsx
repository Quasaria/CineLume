import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';

interface ModalHeaderProps {
  title: ReactNode;
  onBack: () => void;
  // Aria-label personnalisable : sur mobile c'est 'Retour', mais sur les
  // bottom-sheet le bouton sert aussi a fermer la modale, donc l'app peut
  // surcharger (ex: 'Fermer les paramètres').
  backLabel?: string;
  titleId?: string;
  right?: ReactNode;
}

/**
 * Header commun des modales/pages : fleche retour a gauche, titre au
 * milieu, slot optionnel a droite. Garantit la coherence visuelle et
 * la presence d'un bouton retour partout dans l'app.
 */
export function ModalHeader({ title, onBack, backLabel, titleId, right }: ModalHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel || t('common.back')}
        className="min-w-11 min-h-11 -ml-1 flex items-center justify-center rounded-xl hover:bg-white/5 active:bg-white/10 text-white/75 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" aria-hidden="true" />
      </button>
      <h2 id={titleId} className="flex-1 font-bold text-xl sm:text-2xl tracking-tight text-white min-w-0 truncate">
        {title}
      </h2>
      {right}
    </div>
  );
}
