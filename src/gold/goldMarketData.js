const GOLD_MARKET_URL = `${import.meta.env.BASE_URL}gold-prices.json`;

export async function fetchGoldMarketPrices() {
  try {
    const response = await fetch(`${GOLD_MARKET_URL}?v=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data || typeof data !== "object" || !data.items) {
      throw new Error("پاسخ قیمت‌های بازار معتبر نیست.");
    }

    return data;
  } catch (error) {
    console.error("خطا در دریافت قیمت‌های بازار:", error);

    return {
      items: {},
      updatedAt: null
    };
  }
}
