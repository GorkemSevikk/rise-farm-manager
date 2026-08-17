import type { Drop, FarmParticipant, MonthlyEarning, PlayerEarning } from "@/types";
import { formatMonth, monthKey } from "@/lib/format";

/**
 * Bir dropun toplam değeri: satıldıysa gerçek satış fiyatı, satılmadıysa
 * tahmini değer üzerinden hesaplanır. Fiyatlar birim başınadır.
 */
export function dropTotal(drop: Pick<Drop, "quantity" | "estimatedValue" | "soldPrice">): number {
  const unit = drop.soldPrice ?? drop.estimatedValue ?? 0;
  return Math.max(0, (drop.quantity || 0) * (unit || 0));
}

/** Yalnızca gerçekten satılmış dropların toplamı */
export function dropSoldTotal(drop: Pick<Drop, "quantity" | "soldPrice">): number {
  if (drop.soldPrice === null || drop.soldPrice === undefined) return 0;
  return Math.max(0, (drop.quantity || 0) * drop.soldPrice);
}

export interface FarmTotals {
  grossGold: number;
  soldGold: number;
  pendingGold: number;
  expenseGold: number;
  netGold: number;
  dropCount: number;
}

export function calculateFarmTotals(drops: Drop[], expensePercent: number): FarmTotals {
  const grossGold = drops.reduce((sum, drop) => sum + dropTotal(drop), 0);
  const soldGold = drops.reduce((sum, drop) => sum + dropSoldTotal(drop), 0);
  const safePercent = clampPercent(expensePercent);
  const expenseGold = Math.round((grossGold * safePercent) / 100);

  return {
    grossGold,
    soldGold,
    pendingGold: Math.max(0, grossGold - soldGold),
    expenseGold,
    netGold: Math.max(0, grossGold - expenseGold),
    dropCount: drops.length,
  };
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/**
 * Katılımcı paylarını yüzdelere göre dağıtır.
 * Yuvarlama farkı (kuruş kaybı) en yüksek paya sahip oyuncuya eklenir, böylece
 * dağıtılan toplam her zaman net gelire eşit olur.
 */
export function distributeShares(
  participants: Pick<FarmParticipant, "userId" | "sharePercent">[],
  netGold: number
): Record<string, number> {
  const result: Record<string, number> = {};
  if (participants.length === 0) return result;

  const totalPercent = participants.reduce((sum, p) => sum + (p.sharePercent || 0), 0);
  // Yüzdeler toplamı 100 değilse orantılı ölçekleriz; hiç yüzde girilmemişse eşit böleriz.
  const useEqual = totalPercent <= 0;

  let distributed = 0;
  participants.forEach((participant) => {
    const ratio = useEqual
      ? 1 / participants.length
      : (participant.sharePercent || 0) / totalPercent;
    const amount = Math.floor(netGold * ratio);
    result[participant.userId] = amount;
    distributed += amount;
  });

  const remainder = netGold - distributed;
  if (remainder > 0) {
    const biggest = [...participants].sort(
      (a, b) => (b.sharePercent || 0) - (a.sharePercent || 0)
    )[0];
    result[biggest.userId] = (result[biggest.userId] ?? 0) + remainder;
  }

  return result;
}

/** Katılımcı sayısına göre eşit yüzde dağılımı üretir (toplam tam 100 olur). */
export function equalPercentages(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor((100 / count) * 100) / 100;
  const values = Array.from({ length: count }, () => base);
  const diff = Math.round((100 - base * count) * 100) / 100;
  values[0] = Math.round((values[0] + diff) * 100) / 100;
  return values;
}

export function totalPercent(participants: { sharePercent: number }[]): number {
  return Math.round(participants.reduce((sum, p) => sum + (p.sharePercent || 0), 0) * 100) / 100;
}

/**
 * Oyuncu bazlı kazanç tablosunu farm dokümanlarındaki özetten üretir.
 * Tek koleksiyon okuması yeterli olduğu için panel ve kazanç sayfalarında
 * tercih edilir.
 */
export function buildPlayerEarningsFromFarms(
  farms: { shares: { userId: string; name: string; photoURL: string | null; shareGold: number; paymentStatus: "paid" | "pending" }[] }[]
): PlayerEarning[] {
  const map = new Map<string, PlayerEarning>();

  farms.forEach((farm) => {
    farm.shares.forEach((share) => {
      const current = map.get(share.userId) ?? {
        userId: share.userId,
        name: share.name || "Bilinmeyen oyuncu",
        photoURL: share.photoURL,
        totalGold: 0,
        paidGold: 0,
        pendingGold: 0,
        farmCount: 0,
      };

      current.totalGold += share.shareGold;
      current.farmCount += 1;
      if (share.paymentStatus === "paid") {
        current.paidGold += share.shareGold;
      } else {
        current.pendingGold += share.shareGold;
      }

      map.set(share.userId, current);
    });
  });

  return [...map.values()].sort((a, b) => b.totalGold - a.totalGold);
}

/** Aylık kazanç serisi - grafiklerde kronolojik sırada kullanılır */
export function buildMonthlyEarnings(
  farms: { date: Date; grossGold: number; netGold: number }[]
): MonthlyEarning[] {
  const map = new Map<string, MonthlyEarning>();

  farms.forEach((farm) => {
    const key = monthKey(farm.date);
    const current = map.get(key) ?? {
      key,
      label: formatMonth(farm.date),
      gross: 0,
      net: 0,
      farmCount: 0,
    };

    current.gross += farm.grossGold;
    current.net += farm.netGold;
    current.farmCount += 1;
    map.set(key, current);
  });

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}
