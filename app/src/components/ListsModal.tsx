import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, FolderPlus, Trash2, Edit3, Check, Folder, ChevronRight, Smile, Share2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import { IMG, posterSrcSet } from '@/lib/tmdb';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ModalHeader } from '@/components/ui/ModalHeader';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useDragToClose } from '@/hooks/useDragToClose';
import { useFocusRestore } from '@/hooks/useFocusRestore';
import { encodeSharedList } from '@/lib/listShare';
import type { CustomList, FavoriteMovie } from '@/types/movie';

// Set d'emojis curates pour identifier visuellement les listes. Couvre les
// usages courants (cinephile, mood, genre, occasion) sans surcharger.
const EMOJI_PALETTE = ['🎬', '🍿', '⭐', '❤️', '🔥', '😱', '🤣', '💀', '🎭', '🎲', '🌙', '🌟', '🎯', '🎪', '🎨', '🌈', '⚡', '🌶️', '🍷', '🌹'];

export function ListsModal() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const {
    isListsOpen, closeLists, customLists,
    createList, renameList, deleteList, setListEmoji, setListFilms,
    removeFilmFromList, openModal,
  } = useAppStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [emojiPickerListId, setEmojiPickerListId] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const dragHandlers = useDragToClose({ onClose: closeLists, contentRef });
  useBodyScrollLock(isListsOpen);
  useSwipeBack({ onBack: closeLists, enabled: isListsOpen });
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

  async function shareList(list: CustomList) {
    const url = encodeSharedList(list);
    try {
      if (navigator.share) {
        await navigator.share({ title: list.name, url });
        return;
      }
    } catch {
      // user a annule navigator.share, on tombe sur le copy
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('lists.shareCopied'));
    } catch {
      toast.error(t('lists.shareError'));
    }
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
            <ModalHeader
              titleId="lists-modal-title"
              onBack={closeLists}
              backLabel={t('lists.close')}
              title={
                <span className="flex items-center gap-2.5">
                  <Folder className="w-6 h-6 text-violet-400" aria-hidden="true" />
                  {t('lists.title')}
                  {customLists.length > 0 && (
                    <span className="text-white/55 text-sm font-medium">({customLists.length})</span>
                  )}
                </span>
              }
            />

            <div ref={contentRef} className="overflow-y-auto custom-scroll overscroll-contain flex-1 -mx-2 px-2 space-y-3">
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
                    className="flex-1 min-w-0 bg-transparent border-0 outline-none text-base md:text-sm text-white placeholder:text-white/40 px-1 py-1"
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
                  onShare={() => shareList(list)}
                  onOpenFilm={openFilm}
                  onRemoveFilm={(filmId) => removeFilmFromList(list.id, filmId)}
                  onReorder={(newOrder) => {
                    // framer-motion Reorder donne le nouvel ordre complet.
                    // On remplace l'array films d'un coup pour eviter les
                    // bugs de convergence sur reorder complexe (chaque
                    // mutation intermediaire decalerait les indices suivants).
                    setListFilms(list.id, newOrder);
                  }}
                  emojiPickerOpen={emojiPickerListId === list.id}
                  onToggleEmojiPicker={() =>
                    setEmojiPickerListId(emojiPickerListId === list.id ? null : list.id)
                  }
                  onSelectEmoji={(emoji) => {
                    setListEmoji(list.id, emoji);
                    setEmojiPickerListId(null);
                  }}
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
  onShare: () => void;
  onOpenFilm: (id: number) => void;
  onRemoveFilm: (id: number) => void;
  onReorder: (films: FavoriteMovie[]) => void;
  emojiPickerOpen: boolean;
  onToggleEmojiPicker: () => void;
  onSelectEmoji: (emoji: string | undefined) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function ListCard({
  list, expanded, onToggle, editing, editingName, setEditingName,
  onStartEdit, onSubmitEdit, onCancelEdit, onDelete, onShare,
  onOpenFilm, onRemoveFilm, onReorder,
  emojiPickerOpen, onToggleEmojiPicker, onSelectEmoji, t,
}: ListCardProps) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
      <div className="flex items-center gap-2 p-3 relative">
        {/* Trigger emoji : remplace l'icone Folder si emoji defini, sinon
            affiche un emoji vide / Smile a l'opacite reduite. Click ouvre
            le picker. */}
        <button
          type="button"
          onClick={onToggleEmojiPicker}
          aria-label={t('lists.changeEmoji', { name: list.name })}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors text-xl"
        >
          {list.emoji ? (
            <span aria-hidden="true">{list.emoji}</span>
          ) : (
            <Folder className="w-4 h-4 text-violet-300" aria-hidden="true" />
          )}
        </button>

        {editing ? (
          <form
            onSubmit={(e) => { e.preventDefault(); onSubmitEdit(); }}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') onCancelEdit(); }}
              autoFocus
              maxLength={60}
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-base md:text-sm font-semibold text-white px-1"
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
              onClick={onShare}
              aria-label={t('lists.shareAria', { name: list.name })}
              disabled={list.films.length === 0}
              className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-white/40 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
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

        {/* Picker emoji : popover absolu sous le trigger */}
        {emojiPickerOpen && (
          <div
            className="absolute top-full left-0 sm:left-2 z-20 mt-1 p-2 rounded-2xl bg-[#1a1a22] border border-white/10 shadow-2xl shadow-black/40"
            style={{ width: 'min(260px, calc(100vw - 32px))' }}
            role="dialog"
            aria-label={t('lists.pickEmoji')}
          >
            <div className="grid grid-cols-5 gap-1">
              {EMOJI_PALETTE.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelectEmoji(emoji)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg text-xl hover:bg-white/10 active:bg-white/15 transition-colors ${
                    list.emoji === emoji ? 'bg-violet-500/20 border border-violet-500/50' : ''
                  }`}
                  aria-label={emoji}
                >
                  <span aria-hidden="true">{emoji}</span>
                </button>
              ))}
            </div>
            {list.emoji && (
              <button
                type="button"
                onClick={() => onSelectEmoji(undefined)}
                className="w-full mt-2 text-[11px] text-white/55 hover:text-white py-1.5 rounded-md hover:bg-white/5 transition-colors flex items-center justify-center gap-1"
              >
                <Smile className="w-3 h-3" aria-hidden="true" />
                {t('lists.removeEmoji')}
              </button>
            )}
          </div>
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
                <>
                  <p className="text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">
                    {t('lists.reorderHint')}
                  </p>
                  <Reorder.Group
                    axis="x"
                    values={list.films}
                    onReorder={onReorder}
                    className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1 list-none"
                  >
                    {list.films.map((f) => (
                      <ReorderableFilmCard
                        key={f.id}
                        film={f}
                        onOpen={() => onOpenFilm(f.id)}
                        onRemove={() => onRemoveFilm(f.id)}
                        removeLabel={t('lists.removeFilm', { title: f.title })}
                        dragHandleLabel={t('lists.dragHandle', { title: f.title })}
                      />
                    ))}
                  </Reorder.Group>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ReorderableFilmCardProps {
  film: FavoriteMovie;
  onOpen: () => void;
  onRemove: () => void;
  removeLabel: string;
  dragHandleLabel: string;
}

// Carte film dans une liste : tap pour ouvrir, drag-handle (icone grip)
// pour reordonner. On utilise useDragControls + dragListener={false} pour
// que SEULE la poignee declenche le drag, pas le poster (sinon impossible
// de scroller horizontalement le container ni de cliquer pour ouvrir).
function ReorderableFilmCard({ film, onOpen, onRemove, removeLabel, dragHandleLabel }: ReorderableFilmCardProps) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={film}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.05, zIndex: 10 }}
      className="shrink-0"
    >
      <ListFilmCard
        film={film}
        onOpen={onOpen}
        onRemove={onRemove}
        removeLabel={removeLabel}
        dragHandleLabel={dragHandleLabel}
        onDragHandlePointerDown={(e) => controls.start(e)}
      />
    </Reorder.Item>
  );
}

interface ListFilmCardProps {
  film: FavoriteMovie;
  onOpen: () => void;
  onRemove: () => void;
  removeLabel: string;
  dragHandleLabel: string;
  onDragHandlePointerDown: (e: React.PointerEvent) => void;
}

function ListFilmCard({ film, onOpen, onRemove, removeLabel, dragHandleLabel, onDragHandlePointerDown }: ListFilmCardProps) {
  return (
    <div className="relative w-[80px] group">
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
            draggable={false}
            className="w-full h-full object-cover pointer-events-none"
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
      {/* Drag handle : seul element qui declenche le drag de reorder.
          touch-none empeche le browser de capturer le touch en scroll. */}
      <button
        type="button"
        onPointerDown={onDragHandlePointerDown}
        aria-label={dragHandleLabel}
        className="absolute bottom-0.5 left-0.5 w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-black/75 text-white/90 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 touch-none cursor-grab active:cursor-grabbing transition-all"
      >
        <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      <p className="text-[10px] text-white/60 truncate mt-1 w-[80px]">{film.title}</p>
    </div>
  );
}
