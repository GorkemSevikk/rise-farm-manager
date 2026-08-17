const numberFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const monthFormatter = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });

/** 100000000 -> "100.000.000" */
export function formatNumber(value: number): string {
  return numberFormatter.format(Math.round(value || 0));
}

/** 100000000 -> "100.000.000 Altın" */
export function formatGold(value: number): string {
  return `${formatNumber(value)} Altın`;
}

/** 100000000 -> "100 M" ; grafik eksenleri ve dar kartlar için */
export function formatGoldShort(value: number): string {
  const abs = Math.abs(value || 0);
  if (abs >= 1_000_000_000) return `${decimalFormatter.format(value / 1_000_000_000)} Mr`;
  if (abs >= 1_000_000) return `${decimalFormatter.format(value / 1_000_000)} M`;
  if (abs >= 1_000) return `${decimalFormatter.format(value / 1_000)} B`;
  return formatNumber(value);
}

export function formatPercent(value: number): string {
  return `%${decimalFormatter.format(value || 0)}`;
}

export function formatDate(value: Date | null | undefined): string {
  if (!value) return "-";
  return dateFormatter.format(value);
}

export function formatShortDate(value: Date | null | undefined): string {
  if (!value) return "-";
  return shortDateFormatter.format(value);
}

export function formatDateTime(value: Date | null | undefined): string {
  if (!value) return "-";
  return dateTimeFormatter.format(value);
}

export function formatMonth(value: Date): string {
  return monthFormatter.format(value);
}

/** <input type="date"> için "2026-08-17" */
export function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "2026-08-17" -> yerel saat diliminde gece yarısına sabitlenmiş Date */
export function fromDateInputValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function monthKey(value: Date): string {
  return `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, "0")}`;
}

/** "1.250.000" veya "1250000" gibi girdileri sayıya çevirir */
export function parseGoldInput(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
      .join("") || "?"
  );
}

export function relativeTime(value: Date): string {
  const diff = Date.now() - value.getTime();
  const minutes = Math.round(diff / 60000);

  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dakika önce`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} gün önce`;

  return formatShortDate(value);
}
