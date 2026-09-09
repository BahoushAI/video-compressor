import {
  GOLD_ITEMS,
  fetchGoldPrices,
  formatPrice,
  toNumber
} from "./goldData.js";

import {
  loadHistory,
  saveHistory,
  addHistoryPoint,
  getTrend,
  drawMiniChart
} from "./goldChart.js";

export function createGoldSection() {
  const section = document.createElement("section");

  section.className = "gold-section";

  section.innerHTML = `
    <div class="gold-card">

      <h2 class="gold-title">
        قیمت طلا و بازار
      </h2>

      <div id="goldClock" class="gold-clock">
        در حال نمایش ساعت...
      </div>

      <div id="goldStatus" class="gold-loading">
        در حال دریافت قیمت‌ها...
      </div>

      <div id="goldList" class="gold-list" hidden></div>

    </div>
  `;

  return section;
}

function startLiveClock(root) {
  const clock = root.querySelector("#goldClock");

  if (!clock) return;

  function updateClock() {
    const now = new Date();

    const date = new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(now);

    const time = new Intl.DateTimeFormat("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(now);

    clock.textContent = `${date} — ${time}`;
  }

  updateClock();

  const timer = setInterval(updateClock, 1000);

  const observer = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      clearInterval(timer);
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function renderRows(root, items, history) {
  const list = root.querySelector("#goldList");

  if (!list) return;

  list.innerHTML = "";

  GOLD_ITEMS.forEach(item => {
    const value = items[item.id];
    const number = toNumber(value);
    const trend = getTrend(history, item.id);

    const row = document.createElement("div");

    row.className = "gold-row";

    row.innerHTML = `
      <div class="gold-name">
        ${item.name}
      </div>

      <div class="gold-price">
        ${formatPrice(value)}
        <span class="gold-unit">
          ${item.unit}
        </span>
      </div>

      <div class="gold-chart">
        <canvas
          width="108"
          height="56"
          data-chart-id="${item.id}"
          aria-label="نمودار ${item.name}"
        ></canvas>
      </div>
    `;

    list.appendChild(row);

    const canvas = row.querySelector("canvas");

    drawMiniChart(
      canvas,
      history[item.id] || [],
      trend
    );

    if (Number.isFinite(number)) {
      row.dataset.value = String(number);
    }
  });
}

export async function refreshGoldSection(root) {
  const status = root.querySelector("#goldStatus");
  const list = root.querySelector("#goldList");

  if (!status || !list) return;

  status.hidden = false;
  status.className = "gold-loading";
  status.textContent = "در حال دریافت قیمت‌های تازه...";

  list.hidden = true;

  try {
    const data = await fetchGoldPrices();

    const history = loadHistory();

    Object.entries(data.items).forEach(([id, value]) => {
      const number = toNumber(value);

      if (Number.isFinite(number)) {
        addHistoryPoint(history, id, number);
      }
    });

    saveHistory(history);

    if (!root.__goldHistoryTimer) {
      root.__goldHistoryTimer = setInterval(async () => {
        try {
          const fresh = await fetchGoldPrices();
          const latestHistory = loadHistory();

          Object.entries(fresh.items).forEach(([id, value]) => {
            const number = toNumber(value);
            if (Number.isFinite(number)) {
              addHistoryPoint(latestHistory, id, number);
            }
          });

          saveHistory(latestHistory);

          renderRows(root, fresh.items, latestHistory);
        } catch (error) {
          console.warn("خطا در ثبت تاریخچه قیمت:", error);
        }
      }, 10000);
    }

    renderRows(
      root,
      data.items,
      history
    );

    status.hidden = true;
    list.hidden = false;

  } catch (error) {
    console.error("GOLD PRICE ERROR:", error);

    status.hidden = false;
    status.className = "gold-error";
    status.textContent = "❌ دریافت قیمت‌ها انجام نشد.";
  }
}

export function mountGoldSection(parent) {
  if (!parent) {
    throw new Error("محل فصل ۲ پیدا نشد.");
  }

  const section = createGoldSection();

  parent.appendChild(section);

  startLiveClock(section);

  refreshGoldSection(section);

  return section;
}
