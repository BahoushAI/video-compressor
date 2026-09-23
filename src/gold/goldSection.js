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

import { fetchGoldMarketPrices } from "./goldMarketData.js";

const GOLD18_STORAGE_KEY = "gold18Copies";

function loadGold18Copies() {
  try {
    const data = JSON.parse(
      localStorage.getItem(GOLD18_STORAGE_KEY) || "[]"
    );

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveGold18Copies(copies) {
  localStorage.setItem(
    GOLD18_STORAGE_KEY,
    JSON.stringify(copies)
  );
}

function getSelectedCopy(root) {
  const copies = loadGold18Copies();

  if (!copies.length) {
    return null;
  }

  return (
    copies.find(
      item => item.id === root.__selectedGold18CopyId
    ) || copies[copies.length - 1]
  );
}

function doubleTap(element, action) {
  let lastTap = 0;
  let tapTimer = null;

  element.addEventListener("pointerup", event => {
    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();

    if (lastTap && now - lastTap <= 350) {
      clearTimeout(tapTimer);
      tapTimer = null;
      lastTap = 0;
      action();
      return;
    }

    lastTap = now;

    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => {
      lastTap = 0;
      tapTimer = null;
    }, 350);
  });
}

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

  if (!clock) {
    return;
  }

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

function createGold18Controls(root, main, copyId = null) {
  const price = main.querySelector(".gold-price");

  if (!price) {
    return;
  }

  const old = price.querySelector(".gold-18-controls");

  if (old) {
    old.remove();
  }

  const controls = document.createElement("div");

  controls.className = "gold-18-controls";

  for (let i = 1; i <= 6; i++) {
    const dot = document.createElement("button");

    dot.type = "button";
    dot.className = "gold-18-control-dot";
    dot.setAttribute(
      "aria-label",
      `عملیات ${i}`
    );

    doubleTap(
      dot,
      () => gold18Action(root, i, copyId)
    );

    controls.appendChild(dot);
  }

  price.appendChild(controls);
}

function createCopy(root, main) {
  const copies = loadGold18Copies();

  const copy = {
    id:
      `gold18-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    x: 0,
    y: 0,
    width: main.getBoundingClientRect().width,
    locked: false
  };

  copies.push(copy);

  saveGold18Copies(copies);

  root.__selectedGold18CopyId = copy.id;

  renderGold18Copies(root);
}

function syncGold18CopyPrices(root) {
  const list = root.querySelector("#goldList");
  const main = list?.querySelector(".gold-18-main");
  if (!list || !main) return;

  const mainPrice = main.querySelector(".gold-price");
  if (!mainPrice) return;

  list.querySelectorAll(".gold-18-copy").forEach(copy => {
    const price = copy.querySelector(".gold-price");
    if (!price) return;

    const controls =
      price.querySelector(".gold-18-controls");

    const liveContent =
      mainPrice.cloneNode(true);

    liveContent
      .querySelectorAll(".gold-18-controls")
      .forEach(item => item.remove());

    price.innerHTML = liveContent.innerHTML;

    if (controls) {
      price.appendChild(controls);
    }
  });
}

function watchGold18LivePrice(root) {
  const list = root.querySelector("#goldList");
  const main = list?.querySelector(".gold-18-main");
  const mainPrice = main?.querySelector(".gold-price");

  if (!mainPrice || mainPrice.__gold18LiveWatcher) {
    return;
  }

  mainPrice.__gold18LiveWatcher = true;

  const observer = new MutationObserver(() => {
    syncGold18CopyPrices(root);
  });

  observer.observe(mainPrice, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true
  });

  syncGold18CopyPrices(root);
}

function renderGold18Copies(root) {
  const list = root.querySelector("#goldList");
  const main = list?.querySelector(".gold-18-main");

  if (!list || !main) {
    return;
  }

  list
    .querySelectorAll(".gold-18-copy")
    .forEach(item => item.remove());

  const copies = loadGold18Copies();
  const history = loadHistory();
  const value = main.dataset.value;

  watchGold18LivePrice(root);

  copies.forEach(data => {
    const copy = main.cloneNode(true);

    copy.classList.remove("gold-18-main");
    copy.classList.add("gold-18-copy");

    copy.dataset.copyId = data.id;
    const liveDot = document.createElement("span"); liveDot.className = "gold-18-copy-status"; liveDot.setAttribute("aria-label", "قیمت زنده"); copy.appendChild(liveDot);

    copy.style.transform =
      `translate3d(${Number(data.x) || 0}px, ${Number(data.y) || 0}px, 0)`;

    if (Number.isFinite(Number(data.width))) {
      copy.style.width = `${Number(data.width)}px`;
    }

    const price = copy.querySelector(".gold-price");

    if (price) {
      price.innerHTML = `
        ${formatPrice(value)}
        <span class="gold-unit">تومان</span>
      `;
    }

    const canvas = copy.querySelector("canvas");

    if (canvas) {
      drawMiniChart(
        canvas,
        history.gold18 || [],
        getTrend(history, "gold18")
      );
    }

    copy.classList.toggle(
      "gold-18-copy-locked",
      Boolean(data.locked)
    );

    createGold18Controls(
      root,
      copy,
      data.id
    );

    installCopyControls(
      root,
      copy,
      data
    );

    list.appendChild(copy);
  });
}

function installCopyControls(root, copy, data) {
  let dragging = false;
  let resizing = false;

  let startX = 0;
  let startY = 0;
  let startCopyX = 0;
  let startCopyY = 0;
  let startWidth = 0;

  copy.addEventListener("pointerdown", event => {
    root.__selectedGold18CopyId = data.id;

    if (data.locked) {
      return;
    }

    if (root.__gold18Mode !== "move") {
      return;
    }

    dragging = true;

    startX = event.clientX;
    startY = event.clientY;

    startCopyX = Number(data.x) || 0;
    startCopyY = Number(data.y) || 0;

    copy.setPointerCapture?.(event.pointerId);

    event.preventDefault();
    event.stopPropagation();
  });

  copy.addEventListener("pointermove", event => {
    if (!dragging) {
      return;
    }

    data.x =
      startCopyX +
      event.clientX -
      startX;

    data.y =
      startCopyY +
      event.clientY -
      startY;

    copy.style.transform =
      `translate3d(${data.x}px, ${data.y}px, 0)`;
  });

  function finishDrag(event) {
    if (!dragging) {
      return;
    }

    dragging = false;

    copy.releasePointerCapture?.(
      event.pointerId
    );

    saveUpdatedCopy(data);

    root.__gold18Mode = "";
  }

  copy.addEventListener(
    "pointerup",
    finishDrag
  );

  copy.addEventListener(
    "pointercancel",
    finishDrag
  );

  const left = document.createElement("div");
  const right = document.createElement("div");

  left.className = "gold-18-resize-left";
  right.className = "gold-18-resize-right";

  copy.append(left, right);

  function startResize(event) {
    root.__selectedGold18CopyId = data.id;

    if (data.locked) {
      return;
    }

    resizing = true;

    startX = event.clientX;
    startCopyX = data.x || 0;

    startWidth =
      data.width ||
      copy.getBoundingClientRect().width;

    event.currentTarget.setPointerCapture?.(
      event.pointerId
    );

    event.preventDefault();
    event.stopPropagation();
  }

  function resize(event) {
    if (!resizing) {
      return;
    }

    const difference =
      event.clientX - startX;

    const isLeft =
      event.currentTarget === left;

    const newWidth = Math.max(
      180,
      isLeft
        ? startWidth - difference
        : startWidth + difference
    );

    if (isLeft) {
      data.x =
        startCopyX +
        (startWidth - newWidth);

      copy.style.transform =
        `translate3d(${data.x}px, ${data.y || 0}px, 0)`;
    }

    data.width = newWidth;

    copy.style.width =
      `${data.width}px`;
  }

  function finishResize(event) {
    if (!resizing) {
      return;
    }

    resizing = false;

    event.currentTarget.releasePointerCapture?.(
      event.pointerId
    );

    saveUpdatedCopy(data);

    root.__gold18Mode = "";
  }

  [left, right].forEach(handle => {
    handle.addEventListener(
      "pointerdown",
      startResize
    );

    handle.addEventListener(
      "pointermove",
      resize
    );

    handle.addEventListener(
      "pointerup",
      finishResize
    );

    handle.addEventListener(
      "pointercancel",
      finishResize
    );
  });
}

function saveUpdatedCopy(data) {
  const copies = loadGold18Copies();

  const index = copies.findIndex(
    item => item.id === data.id
  );

  if (index !== -1) {
    copies[index] = data;
    saveGold18Copies(copies);
  }
}

function gold18Action(root, action, copyId = null) {
  const list = root.querySelector("#goldList");
  const main = list?.querySelector(".gold-18-main");

  if (!main) {
    return;
  }

  if (action === 1) {
    createCopy(root, main);
    return;
  }

  if (copyId) {
    root.__selectedGold18CopyId = copyId;
  }

  if (copyId) {
    root.__selectedGold18CopyId = copyId;
  }

  const selected = getSelectedCopy(root);

  if (!selected) {
    return;
  }

  root.__selectedGold18CopyId = selected.id;

  if (action === 2) {
    if (!selected.locked) {
      root.__selectedGold18CopyId = selected.id;
      root.__gold18Mode = "move";
    }
    return;
  }

  if (action === 3) {
    if (!selected.locked) {
      root.__gold18Mode = "resize";
    }
    return;
  }

  if (action === 4) {
    selected.locked = !selected.locked;
    root.__gold18Mode = "";
    saveUpdatedCopy(selected);
    renderGold18Copies(root);
    return;
  }

  if (action === 5) {
    const copies = loadGold18Copies();

    saveGold18Copies(
      copies.filter(
        item => item.id !== selected.id
      )
    );

    root.__selectedGold18CopyId = null;
    root.__gold18Mode = "";

    renderGold18Copies(root);
    return;
  }

  if (action === 6) {
    selected.x = 0;
    selected.y = 0;
    selected.width =
      main.getBoundingClientRect().width;

    saveUpdatedCopy(selected);

    root.__gold18Mode = "";

    renderGold18Copies(root);
  }
}

function renderRows(root, items, history) {
  const list = root.querySelector("#goldList");

  if (!list) {
    return;
  }

  list.innerHTML = "";

  GOLD_ITEMS.forEach(item => {
    const row = document.createElement("div");

    row.className = "gold-row";

    if (item.id === "gold18") {
      row.classList.add("gold-18-main");
    }

    row.innerHTML = `
      <div class="gold-name">
        ${item.name}
      </div>

      <div class="gold-price">
        ${formatPrice(items[item.id])}
        <span class="gold-unit">
          ${item.unit}
        </span>
      </div>

      <div class="gold-chart">
        <canvas
          width="216"
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
      getTrend(history, item.id)
    );

    const number = toNumber(items[item.id]);

    if (Number.isFinite(number)) {
      row.dataset.value = String(number);
    }

    if (item.id === "gold18") {
      createGold18Controls(root, row);
    }
  });

  renderGold18Copies(root);
}

export async function refreshGoldSection(root) {
  if (!document.body.contains(root)) {
    if (root.__goldHistoryTimer) {
      clearInterval(root.__goldHistoryTimer);
      root.__goldHistoryTimer = null;
    }
    return;
  }

  const status = root.querySelector("#goldStatus");
  const list = root.querySelector("#goldList");

  if (!status || !list) {
    return;
  }

  try {
    const [
      gold18Data,
      marketData
    ] = await Promise.all([
      fetchGoldPrices(),
      fetchGoldMarketPrices()
    ]);

    const data = {
      items: {
        ...marketData.items,
        ...gold18Data.items
      }
    };

    const history = loadHistory();

    Object.entries(data.items).forEach(
      ([id, value]) => {
        const number = toNumber(value);

        if (Number.isFinite(number)) {
          addHistoryPoint(
            history,
            id,
            number
          );
        }
      }
    );

    saveHistory(history);

    renderRows(
      root,
      data.items,
      history
    );

    status.hidden = true;
    list.hidden = false;

    if (!root.__goldHistoryTimer) {
      root.__goldHistoryTimer = setInterval(
        () => refreshGoldSection(root),
        10000
      );
    }
  } catch (error) {
    console.error(
      "GOLD PRICE ERROR:",
      error
    );

    status.hidden = false;
    status.className = "gold-error";
    status.textContent =
      "❌ دریافت قیمت‌ها انجام نشد.";
  }
}

export function mountGoldSection(parent) {
  if (!parent) {
    throw new Error(
      "محل فصل ۲ پیدا نشد."
    );
  }

  const section = createGoldSection();

  parent.appendChild(section);

  startLiveClock(section);
  refreshGoldSection(section);

  return section;
}
