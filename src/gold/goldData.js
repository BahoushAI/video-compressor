const GOLD_API_URL = "https://tabangohar.com/GheymatKhan/prices_in_table.html";

export const GOLD_ITEMS = [
  { id: "gold18", name: "طلای ۱۸ عیار", unit: "تومان" },
  { id: "gold24", name: "طلای ۲۴ عیار", unit: "تومان" },
  { id: "gold21", name: "طلای ۲۱ عیار", unit: "تومان" },
  { id: "gold20", name: "طلای ۲۰ عیار", unit: "تومان" },
  { id: "silver", name: "نقره", unit: "تومان" },
  { id: "usd", name: "دلار", unit: "تومان" },
  { id: "eur", name: "یورو", unit: "تومان" },
  { id: "aed", name: "درهم", unit: "تومان" },
  { id: "ounce", name: "انس طلا", unit: "دلار" },
  { id: "silverOunce", name: "انس نقره", unit: "دلار" },
  { id: "coinEmami", name: "سکه امامی", unit: "تومان" },
  { id: "coinBahar", name: "سکه بهار آزادی", unit: "تومان" },
  { id: "halfCoin", name: "نیم سکه", unit: "تومان" },
  { id: "quarterCoin", name: "ربع سکه", unit: "تومان" },
  { id: "gramCoin", name: "سکه گرمی", unit: "تومان" }
];

export function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value)
    .replace(/[۰-۹]/g, char => "۰۱۲۳۴۵۶۷۸۹".indexOf(char))
    .replace(/[٠-٩]/g, char => "٠١٢٣٤٥٦٧٨٩".indexOf(char))
    .replace(/,/g, "")
    .replace(/٬/g, "")
    .replace(/\s/g, "")
    .replace(/[^\d.-]/g, "");

  if (!text) {
    return null;
  }

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
}

export function formatPrice(value) {
  const number = toNumber(value);

  if (number === null) {
    return "در دسترس نیست";
  }

  return new Intl.NumberFormat("fa-IR").format(number);
}

export async function fetchGoldPrices() {
  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;

      if (xhr.status !== 200 && xhr.status !== 304) {
        reject(new Error(`HTTP ${xhr.status}`));
        return;
      }

      try {
        const data = JSON.parse(xhr.responseText);

        if (!data || typeof data !== "object") {
          throw new Error("پاسخ سرویس قیمت معتبر نیست.");
        }

        resolve({
          items: {
            gold18: toNumber(data.c)
          }
        });
      } catch (error) {
        reject(error);
      }
    };

    xhr.onerror = () => {
      reject(new Error("ارتباط با سرویس قیمت تبان‌گهر برقرار نشد."));
    };

    xhr.open(
      "GET",
      `${GOLD_API_URL}?v=${new Date().toISOString().substring(0, 16)}`,
      true
    );

    xhr.setRequestHeader(
      "Content-Type",
      "application/x-www-form-urlencoded"
    );

    xhr.send("item=c");
  });
}

