import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, FolderPlus, Trash2, Edit3, Check, Folder, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { IMG, posterSrcSet } from '@/lib/tmdb';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useDragToClose } from '@/hooks/useDragToClose';
import { useFocusRestore } from '@/hooks/useFocusRestore';
import type { CustomList, FavoriteMovie } from '@/types/movie';

/**
 * Modale "Mes listes" : permet de creer, renommer, supprimer et naviguer
 * dans les listes personnalisees de l'user. Chaque liste est un panel
 * expandable affichant les films en horizontal scroll, avec retrait par
 * film. Sub-modal pour creer/renommer (input inline).
 */
export function ListsModal() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const {
    isListsOpen, closeLists, customLists,
    createList, renameList, deleteList,
    removeFilmFromList, openModal,
  } = useAppStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const contentRef = useRef<HTMLDivElement>(null);
  const dragHandlers = useDragToClose({ onClose: closeLists, contentRef });
  useBodyScrollLock(isListsOpen);
  useFocusRestore(isListsOpen);

  const sortedLists = useMemo(
    () => [...customLists].sort((a, b) => b.createdAt - a.createdAt),
    [customLists],
  );

  function submitCreate() {
    const name = newName.trim();
    if (!name) return;
    createList(name);
    setNewName('');
    setCreating(false);
  }

  function startEdit(list: CustomList) {
    setEditingId(list.id);
    setEditingName(list.name);
  }

  function submitEdit() {
    if (editingId && editingName.trim()) {
      renameList(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  }

  function confirmDelete(list: CustomList) {
    if (window.confirm(t('lists.deleteConfirm', { name: list.name }))) {
      deleteList(list.id);
      if (expandedId === list.id) setExpandedId(null);
    }
  }

  function openFilm(filmId: number) {
    closeLists();
    openModal(filmId);
  }

  return (
    <AnimatePresence>
      {isListsOpen && (
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
            onClick={closeLists}
          />
          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lists-modal-title"
            className="relative bg-[#0f0f15] rounded-t-3xl md:rounded-3xl px-5 pt-3 pb-6 md:p-6 max-w-lg w-full max-h-[90dvh] md:max-h-[80vh] border border-white/10 shadow-2xl flex flex-col"
            {...dragHandlers}
          >
            <div className="w-12 h-1.5 rounded-full bg-white/30 mx-auto mb-3 md:hidden" aria-hidden="true" />
            <div className="flex items-center justify-between mb-4">
              <h3 id="lists-modal-title" className="font-bold text-2xl tracking-tight flex items-center gap-2.5">
                <Folder className="w-6 h-6 text-violet-400" aria-hidden="true" />
                {t('lists.title')}
                {customLists.length > 0 && (
                  <span className="text-white/55 text-sm font-medium">({customLists.length})</span>
                )}
              </h3>
              <button
                type="button"
                onClick={closeLists}
                aria-label={t('lists.close')}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-white/70" aria-hidden="true" />
              </button>
            </div>

            <div ref={contentRef} className="overflow-y-auto custom-scroll overscroll-contain flex-1 -mx-2 px-2 space-y-3">
              {/* Bouton/formulaire creation */}
              {creating ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); submitCreate(); }}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-violet-500/10 border border-violet-500/30"
                >
                  <FolderPlus className="w-5 h-5 text-violet-300 shrink-0" aria-hidden="true" />
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                    }}
                    placeholder={t('lists.namePlaceholder')}
                    autoFocus
                    maxLength={60}
                    className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-white placeholder:text-white/40 px-1 py-1"
                  />
                  <button
                    type="submit"
                    disabled={!newName.trim()}
                    aria-label={t('lists.create')}
                    className="min-w-11 min-h-11 flex items-center justify-center rounded-lg bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Check className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCreating(false); setNewName(''); }}
                    aria-label={t('common.cancel')}
                    className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-white/60 hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-violet-500/10 hover:bg-violet-500/15 active:bg-violet-500/20 border border-dashed border-violet-500/40 text-violet-300 font-semibold text-sm transition-colors"
                >
                  <FolderPlus className="w-4 h-4" aria-hidden="true" />
                  {t('lists.createNew')}
                </button>
              )}

              {sortedLists.length === 0 && !creating && (
                <div className="text-center py-10">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Folder className="w-7 h-7 text-white/30" aria-hidden="true" />
                  </div>
                  <p className="text-white/60 text-sm">{t('lists.empty')}</p>
                  <p className="text-white/40 text-xs mt-1">{t('lists.emptyHint')}</p>
                </div>
              )}

              {sortedLists.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  expanded={expandedId === list.id}
                  onToggle={() => setExpandedId(expandedId === list.id ? null : list.id)}
                  editing={editingId === list.id}
                  editingName={editingName}
                  setEditingName={setEditingName}
                  onStartEdit={() => startEdit(list)}
                  onSubmitEdit={submitEdit}
                  onCancelEdit={() => { setEditingId(null); setEditingName(''); }}
                  onDelete={() => confirmDelete(list)}
                  onOpenFilm={openFilm}
                  onRemoveFilm={(filmId) => removeFilmFromList(list.id, filmId)}
                  t={t}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ListCardProps {
  list: CustomList;
  expanded: boolean;
  onToggle: () => void;
  editing: boolean;
  editingName: string;
  setEditingName: (s: string) => void;
  onStartEdit: () => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onOpenFilm: (id: number) => void;
  onRemoveFilm: (id: number) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function ListCard({
  list, expanded, onToggle, editing, editingName, setEditingName,
  onStartEdit, onSubmitEdit, onCancelEdit, onDelete, onOpenFilm, onRemoveFilm, t,
}: ListCardProps) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        {editing ? (
          <form
            onSubmit={(e) => { e.preventDefault(); onSubmitEdit(); }}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <Folder className="w-4 h-4 text-violet-300 shrink-0" aria-hidden="true" />
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') onCancelEdit(); }}
              autoFocus
              maxLength={60}
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm font-semibold text-white px-1"
            />
            <button
              type="submit"
              disabled={!editingName.trim()}
              aria-label={t('lists.saveName')}
              className="min-w-11 min-h-11 flex items-center justify-center rounded-lg bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-30 transition-colors"
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              aria-label={t('common.cancel')}
              className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-white/60 hover:bg-white/5 transition-colors"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              className="flex-1 flex items-center gap-2 min-w-0 text-left hover:opacity-80 transition-opacity"
            >
              <Folder className="w-4 h-4 text-violet-300 shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold text-white truncate flex-1">{list.name}</span>
              <span className="text-xs text-white/45 font-medium">
                {t('lists.filmCount', { count: list.films.length })}
              </span>
              <ChevronRight
                className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={onStartEdit}
              aria-label={t('lists.renameAria', { name: list.name })}
              className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={t('lists.deleteAria', { name: list.name })}
              className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              {list.films.length === 0 ? (
                <p className="text-xs text-white/45 italic py-2">{t('lists.listEmpty')}</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                  {list.films.map((f) => (
                    <ListFilmCard
                      key={f.id}
                      film={f}
                      onOpen={() => onOpenFilm(f.id)}
                      onRemove={() => onRemoveFilm(f.id)}
                      removeLabel={t('lists.removeFilm', { title: f.title })}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ListFilmCardProps {
  film: FavoriteMovie;
  onOpen: () => void;
  onRemove: () => void;
  removeLabel: string;
}

function ListFilmCard({ film, onOpen, onRemove, removeLabel }: ListFilmCardProps) {
  return (
    <div className="relative shrink-0 w-[80px] group">
      <button
        type="button"
        onClick={onOpen}
        className="block w-[80px] aspect-[2/3] rounded-lg overflow-hidden bg-white/5 border border-white/[0.06] hover:border-violet-500/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        aria-label={film.title}
      >
        {film.poster_path ? (
          <img
            src={`${IMG}${film.poster_path}`}
            srcSet={posterSrcSet(film.poster_path)}
            sizes="80px"
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">?</div>
        )}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute top-0.5 right-0.5 w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-black/75 text-white hover:bg-red-500/90 active:bg-red-500 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-all"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      <p className="text-[10px] text-white/60 truncate mt-1 w-[80px]">{film.title}</p>
    </div>
  );
}
