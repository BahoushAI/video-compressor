import { mkdir, writeFile } from "node:fs/promises";

const markets = {
  gold24: {
    url: "https://www.tgju.org/profile/geram24",
    rial: true
  },
  silver: {
    url: "https://www.tgju.org/profile/silver_999",
    rial: true
  },
  usd: {
    url: "https://www.tgju.org/profile/price_dollar_rl",
    rial: true
  },
  eur: {
    url: "https://www.tgju.org/profile/price_eur",
    rial: true
  },
  aed: {
    url: "https://www.tgju.org/profile/price_aed",
    rial: true
  },
  ounce: {
    url: "https://www.tgju.org/profile/ons",
    rial: false
  },
  silverOunce: {
    url: "https://www.tgju.org/profile/silver",
    rial: false
  },
  coinEmami: {
    url: "https://www.tgju.org/profile/sekee",
    rial: true
  },
  coinBahar: {
    url: "https://www.tgju.org/profile/sekeb",
    rial: true
  },
  halfCoin: {
    url: "https://www.tgju.org/profile/nim",
    rial: true
  },
  quarterCoin: {
    url: "https://www.tgju.org/profile/rob",
    rial: true
  },
  gramCoin: {
    url: "https://www.tgju.org/profile/gerami",
    rial: true
  }
};

function normalizeDigits(value) {
  return String(value)
    .replace(/[۰-۹]/g, ch => "۰۱۲۳۴۵۶۷۸۹".indexOf(ch))
    .replace(/[٠-٩]/g, ch => "٠١٢٣٤٥٦٧٨٩".indexOf(ch));
}

function parseCurrentRate(html) {
  const text = normalizeDigits(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
  );

  const match = text.match(/نرخ\s*فعلی\s*:?\s*([0-9][0-9,٬\s]*)/);

  if (!match) {
    throw new Error("نرخ فعلی در صفحه پیدا نشد.");
  }

  const number = Number(
    match[1]
      .replace(/,/g, "")
      .replace(/٬/g, "")
      .replace(/\s/g, "")
  );

  if (!Number.isFinite(number) || number <= 0) {
    throw new Error("عدد قیمت معتبر نیست.");
  }

  return number;
}

async function fetchMarket(key, config) {
  const response = await fetch(config.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 GitHubActions GoldPriceUpdater"
    }
  });

  if (!response.ok) {
    throw new Error(`${key}: HTTP ${response.status}`);
  }

  const html = await response.text();
  let value = parseCurrentRate(html);

  if (config.rial) {
    value = value / 10;
  }

  return Math.round(value * 100) / 100;
}

const items = {};
const errors = {};

for (const [key, config] of Object.entries(markets)) {
  try {
    items[key] = await fetchMarket(key, config);
    console.log(`${key}: ${items[key]}`);
  } catch (error) {
    errors[key] = String(error.message || error);
    console.error(`${key}: ${errors[key]}`);
  }
}

const output = {
  items,
  updatedAt: new Date().toISOString(),
  source: "TGJU",
  errors
};

await mkdir("public", { recursive: true });
await writeFile(
  "public/gold-prices.json",
  JSON.stringify(output, null, 2) + "\n",
  "utf8"
);

if (Object.keys(items).length === 0) {
  process.exit(1);
}
