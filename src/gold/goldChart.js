const HISTORY_KEY = "gold-price-history";
const MAX_POINTS = 100000;

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return {};

    const data = JSON.parse(raw);

    return data && typeof data === "object" && !Array.isArray(data)
      ? data
      : {};
  } catch {
    return {};
  }
}

export function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // خطای ذخیره تاریخچه نباید برنامه را متوقف کند.
  }
}

export function addHistoryPoint(history, id, value) {
  const price = Number(value);

  if (!Number.isFinite(price)) return;

  if (!Array.isArray(history[id])) {
    history[id] = [];
  }

  history[id].push({
    time: Date.now(),
    price
  });

  if (history[id].length > MAX_POINTS) {
    history[id] = history[id].slice(-MAX_POINTS);
  }
}

export function getTrend(history, id) {
  const points = history[id] || [];

  if (points.length < 2) {
    return "neutral";
  }

  const previous = Number(points[points.length - 2].price);
  const current = Number(points[points.length - 1].price);

  if (!Number.isFinite(previous) || !Number.isFinite(current)) {
    return "neutral";
  }

  if (current > previous) return "up";
  if (current < previous) return "down";

  return "neutral";
}

export function drawMiniChart(canvas, points, trend) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // زمینه مشکی
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, h);

  const pts = (Array.isArray(points) ? points : [])
    .map(p => Number(p?.price))
    .filter(Number.isFinite)
    .slice(-100000);

  if (pts.length < 2) return;

  let min = Math.min(...pts);
  let max = Math.max(...pts);

  const range = max - min || Math.max(Math.abs(max) * 0.001, 1);

  min -= range * 0.08;
  max += range * 0.08;

  const drawRange = max - min || 1;

  ctx.beginPath();

  for (let i = 1; i < pts.length; i++) {
    const x1 = 3 + ((i - 1) / (pts.length - 1)) * (w - 6);
    const y1 = h - 4 - ((pts[i - 1] - min) / drawRange) * (h - 8);

    const x2 = 3 + (i / (pts.length - 1)) * (w - 6);
    const y2 = h - 4 - ((pts[i] - min) / drawRange) * (h - 8);

    if (i === 1) {
      ctx.moveTo(x1, y1);
    } else {
      ctx.lineTo(x1, y1);
    }

    ctx.lineTo(x2, y2);
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#20d66b";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  // نقاط روی موج
  ctx.fillStyle = "#20d66b";

  const pointStep = Math.max(1, Math.floor(pts.length / 500));

  for (let i = 0; i < pts.length; i += pointStep) {
    const x = 3 + (i / (pts.length - 1)) * (w - 6);
    const y = h - 4 - ((pts[i] - min) / drawRange) * (h - 8);

    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // آخرین نقطه
  const lastX = w - 3;
  const lastY =
    h - 4 - ((pts[pts.length - 1] - min) / drawRange) * (h - 8);

  ctx.beginPath();
  ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
  ctx.fill();
}
