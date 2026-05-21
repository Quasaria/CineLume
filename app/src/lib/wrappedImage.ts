import type { WrappedStats } from './wrappedStats';

/**
 * Genere une image PNG carre format Story (1080x1920) du Wrapped pour
 * partage natif (navigator.share) ou telechargement.
 *
 * Variante :
 * - 'simple' : carte compacte avec hero + top 3 posters + top genre
 * - 'detailed' : carte plus dense avec en plus top genres, decade, streak,
 *   jour de la semaine prefere
 *
 * Tous les rendus dans la DA : fond noir glace, blobs gradient violet/cyan/
 * fuchsia, typo gradient gigantesque, posters arrondis.
 */
export type WrappedImageVariant = 'simple' | 'detailed';

export interface WrappedImageLabels {
  brand: string;
  filmsSeenLabel: string;
  vsPrev: string;
  firstPeriod: string;
  topFilm: string;
  topFilms: string;
  favGenre: string;
  yourGenres: string;
  streak: string;
  decade: string;
  biggestDay: string;
  daysShort: string;
  filmsShort: string;
}

const W = 1080;
const H = 1920;
const FONT = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

interface GenerateOptions {
  variant: WrappedImageVariant;
  genreNames: Map<number, string>;
  lang: string;
  labels: WrappedImageLabels;
  brandTagline: string;
  appUrl: string;
}

export async function generateWrappedImage(
  stats: WrappedStats,
  options: GenerateOptions,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context indisponible');

  drawBackground(ctx);
  drawHeader(ctx, stats, options.labels);
  drawHeroStat(ctx, stats, options.labels);

  if (options.variant === 'simple') {
    await drawPosterStrip(ctx, stats.topFilms.slice(0, 3), 880, 320, options.labels);
    drawTopGenreCallout(ctx, stats, options.genreNames, 1260, options.labels);
    drawFooter(ctx, options);
  } else {
    await drawPosterStrip(ctx, stats.topFilms.slice(0, 5), 840, 280, options.labels);
    drawTopGenresBars(ctx, stats, options.genreNames, 1170, options.labels);
    drawSecondaryStats(ctx, stats, options.labels, 1490);
    drawFooter(ctx, options);
  }

  // toBlob peut echouer si le canvas est taint (CORS poster manque) :
  // on essaie sans posters en fallback en re-rendant juste le texte.
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('canvas.toBlob a renvoye null (canvas potentiellement taint)'));
      },
      'image/png',
      0.95,
    );
  });
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  // Base noire profonde
  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(0, 0, W, H);

  // Ambient blobs : violet en haut a gauche, cyan a droite, fuchsia en bas
  drawBlob(ctx, 180, 320, 520, 'rgba(124, 58, 237, 0.45)');
  drawBlob(ctx, 920, 880, 480, 'rgba(6, 182, 212, 0.32)');
  drawBlob(ctx, 220, 1600, 520, 'rgba(217, 70, 239, 0.32)');

  // Voile leger pour unifier
  const veil = ctx.createLinearGradient(0, 0, 0, H);
  veil.addColorStop(0, 'rgba(10, 10, 16, 0.35)');
  veil.addColorStop(0.5, 'rgba(10, 10, 16, 0.15)');
  veil.addColorStop(1, 'rgba(10, 10, 16, 0.45)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, W, H);
}

function drawBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function drawHeader(ctx: CanvasRenderingContext2D, stats: WrappedStats, labels: WrappedImageLabels) {
  ctx.font = `700 28px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.textAlign = 'center';
  ctx.fillText(`CINELUME · ${labels.brand}`, W / 2, 120);

  const periodText = stats.periodLabel.toUpperCase();
  ctx.font = `900 84px ${FONT}`;
  const grad = ctx.createLinearGradient(0, 180, W, 280);
  grad.addColorStop(0, '#c4b5fd');
  grad.addColorStop(0.5, '#f0abfc');
  grad.addColorStop(1, '#67e8f9');
  ctx.fillStyle = grad;
  ctx.textAlign = 'center';
  ctx.fillText(periodText, W / 2, 250);
}

function drawHeroStat(ctx: CanvasRenderingContext2D, stats: WrappedStats, labels: WrappedImageLabels) {
  ctx.font = `800 26px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.textAlign = 'center';
  ctx.fillText(labels.filmsSeenLabel.toUpperCase(), W / 2, 360);

  // Grand chiffre central. On scale dynamiquement si le total est tres grand
  // (e.g. 10000+ films) pour ne pas deborder du canvas.
  const totalStr = String(stats.total);
  const maxWidth = W - 120;
  let fontSize = 320;
  ctx.font = `900 ${fontSize}px ${FONT}`;
  const measured = ctx.measureText(totalStr);
  if (measured.width > maxWidth) {
    fontSize = Math.floor((fontSize * maxWidth) / measured.width);
    ctx.font = `900 ${fontSize}px ${FONT}`;
  }
  const heroGrad = ctx.createLinearGradient(0, 400, 0, 720);
  heroGrad.addColorStop(0, '#ffffff');
  heroGrad.addColorStop(0.6, '#e9d5ff');
  heroGrad.addColorStop(1, '#a5f3fc');
  ctx.fillStyle = heroGrad;
  ctx.textBaseline = 'middle';
  ctx.fillText(totalStr, W / 2, 560);
  ctx.textBaseline = 'alphabetic';

  ctx.font = `700 30px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  if (stats.prevPeriodDelta !== null) {
    const sign = stats.prevPeriodDelta > 0 ? '+' : '';
    ctx.fillText(`${sign}${stats.prevPeriodDelta}% ${labels.vsPrev}`, W / 2, 760);
  } else if (stats.prevPeriodTotal === 0 && stats.total > 0) {
    ctx.fillText(labels.firstPeriod, W / 2, 760);
  }
}

async function loadPoster(path: string | null): Promise<HTMLImageElement | null> {
  if (!path) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `${TMDB_POSTER_BASE}${path}`;
  });
}

async function drawPosterStrip(
  ctx: CanvasRenderingContext2D,
  films: WrappedStats['topFilms'],
  y: number,
  posterHeight: number,
  labels: WrappedImageLabels,
) {
  if (films.length === 0) return;
  const label = (films.length === 1 ? labels.topFilm : labels.topFilms).toUpperCase();
  ctx.font = `800 26px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.textAlign = 'center';
  ctx.fillText(label, W / 2, y - 36);

  const aspectW = posterHeight * (2 / 3);
  const gap = 24;
  const total = aspectW * films.length + gap * (films.length - 1);
  let x = (W - total) / 2;

  const posters = await Promise.all(films.map((f) => loadPoster(f.poster_path)));
  for (let i = 0; i < films.length; i++) {
    const img = posters[i];
    drawRoundedPoster(ctx, x, y, aspectW, posterHeight, img, films[i].title);
    x += aspectW + gap;
  }
}

function drawRoundedPoster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  img: HTMLImageElement | null,
  fallbackTitle: string,
) {
  const radius = 28;
  ctx.save();
  // Glow leger autour du poster
  ctx.shadowColor = 'rgba(124, 58, 237, 0.4)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 8;
  roundedRectPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = '#1a1a22';
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRectPath(ctx, x, y, w, h, radius);
  ctx.clip();
  if (img) {
    // cover : on remplit le rect en preservant le ratio
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const boxRatio = w / h;
    let drawW = w, drawH = h, dx = x, dy = y;
    if (imgRatio > boxRatio) {
      drawH = h;
      drawW = h * imgRatio;
      dx = x - (drawW - w) / 2;
    } else {
      drawW = w;
      drawH = w / imgRatio;
      dy = y - (drawH - h) / 2;
    }
    ctx.drawImage(img, dx, dy, drawW, drawH);
  } else {
    // Fallback : gradient + titre
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#312e81');
    g.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `700 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(truncate(fallbackTitle, 18), x + w / 2, y + h / 2);
  }
  // Border
  ctx.restore();
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, radius);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTopGenreCallout(
  ctx: CanvasRenderingContext2D,
  stats: WrappedStats,
  genreNames: Map<number, string>,
  y: number,
  labels: WrappedImageLabels,
) {
  const top = stats.topGenres[0];
  if (!top) return;
  const rawName = genreNames.get(top.id) || '—';

  ctx.font = `800 24px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.textAlign = 'center';
  ctx.fillText(labels.favGenre.toUpperCase(), W / 2, y);

  // Auto-scale du nom pour rentrer dans la bar (sinon genres longs comme
  // "Science-Fiction" depassent visuellement la bar gradient).
  const padX = 48;
  const maxBarW = W - 80;
  let fontSize = 96;
  const txt = truncate(rawName.toUpperCase(), 22);
  ctx.font = `900 ${fontSize}px ${FONT}`;
  let measured = ctx.measureText(txt);
  while (measured.width + padX * 2 > maxBarW && fontSize > 36) {
    fontSize -= 6;
    ctx.font = `900 ${fontSize}px ${FONT}`;
    measured = ctx.measureText(txt);
  }
  const barW = Math.min(maxBarW, measured.width + padX * 2);
  const barH = Math.max(110, fontSize + 34);
  const barX = (W - barW) / 2;
  const barY = y + 30;
  ctx.save();
  roundedRectPath(ctx, barX, barY, barW, barH, 28);
  const g = ctx.createLinearGradient(barX, barY, barX + barW, barY + barH);
  g.addColorStop(0, 'rgba(124, 58, 237, 0.45)');
  g.addColorStop(1, 'rgba(217, 70, 239, 0.35)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(txt, W / 2, barY + barH / 2);
  ctx.textBaseline = 'alphabetic';

  ctx.font = `700 28px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(`${top.count} ${labels.filmsShort} · ${top.pct}%`, W / 2, barY + barH + 50);
}

function drawTopGenresBars(
  ctx: CanvasRenderingContext2D,
  stats: WrappedStats,
  genreNames: Map<number, string>,
  y: number,
  labels: WrappedImageLabels,
) {
  const genres = stats.topGenres.slice(0, 4);
  if (genres.length === 0) return;

  ctx.font = `800 26px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.textAlign = 'center';
  ctx.fillText(labels.yourGenres.toUpperCase(), W / 2, y);

  const max = genres[0].count;
  const barX = 100;
  const labelW = 320;
  const barTrackX = barX + labelW + 24;
  const barTrackW = W - barTrackX - 100;
  const barH = 22;
  const rowH = 78;
  let rowY = y + 40;

  for (const g of genres) {
    const name = (genreNames.get(g.id) || '—').toUpperCase();
    ctx.font = `800 32px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(truncate(name, 18), barX, rowY + 28);
    // Track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    roundedRectPath(ctx, barTrackX, rowY + 14, barTrackW, barH, barH / 2);
    ctx.fill();
    // Filled portion
    const fillW = Math.max(barH, (g.count / max) * barTrackW);
    ctx.save();
    roundedRectPath(ctx, barTrackX, rowY + 14, fillW, barH, barH / 2);
    const gr = ctx.createLinearGradient(barTrackX, 0, barTrackX + fillW, 0);
    gr.addColorStop(0, '#8b5cf6');
    gr.addColorStop(0.5, '#d946ef');
    gr.addColorStop(1, '#06b6d4');
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.restore();
    ctx.font = `800 28px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.textAlign = 'right';
    ctx.fillText(String(g.count), barTrackX + barTrackW + 60, rowY + 28);
    rowY += rowH;
  }
}

function drawSecondaryStats(
  ctx: CanvasRenderingContext2D,
  stats: WrappedStats,
  labels: WrappedImageLabels,
  y: number,
) {
  const items: Array<{ label: string; value: string }> = [];
  items.push({
    label: labels.streak.toUpperCase(),
    value: stats.longestStreak > 0 ? `${stats.longestStreak} ${labels.daysShort}` : '—',
  });
  if (stats.topDecade) {
    items.push({
      label: labels.decade.toUpperCase(),
      value: `${stats.topDecade.decade}s`,
    });
  }
  if (stats.bestDay) {
    items.push({
      label: labels.biggestDay.toUpperCase(),
      value: `${stats.bestDay.count} ${labels.filmsShort}`,
    });
  }
  while (items.length < 3) items.push({ label: '—', value: '—' });

  const gap = 24;
  const cardW = (W - 200 - gap * 2) / 3;
  const cardH = 200;
  let x = 100;
  for (const it of items) {
    ctx.save();
    roundedRectPath(ctx, x, y, cardW, cardH, 28);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.font = `900 56px ${FONT}`;
    const g = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
    g.addColorStop(0, '#c4b5fd');
    g.addColorStop(1, '#67e8f9');
    ctx.fillStyle = g;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.value, x + cardW / 2, y + 80);

    ctx.font = `700 18px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(it.label, x + cardW / 2, y + 158);

    ctx.textBaseline = 'alphabetic';
    x += cardW + gap;
  }
}

function drawFooter(ctx: CanvasRenderingContext2D, options: GenerateOptions) {
  ctx.font = `700 24px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.textAlign = 'center';
  ctx.fillText(options.brandTagline, W / 2, H - 110);
  ctx.font = `600 22px ${FONT}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillText(options.appUrl, W / 2, H - 70);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}
