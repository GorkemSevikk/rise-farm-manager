"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { dropTotal } from "@/lib/profit";
import { formatGold } from "@/lib/format";
import type { Drop } from "@/types";

/**
 * Başka bir üye drop eklediğinde ekranda bildirim gösterir.
 * Liste zaten Firestore dinleyicisiyle kendini güncelliyor; buradaki amaç
 * değişikliğin gözden kaçmaması.
 *
 * İlk yüklemede gelen kayıtlar "yeni" sayılmaz: `ready` true olduktan sonraki
 * ilk snapshot referans kabul edilir.
 */
export function useDropAlerts(drops: Drop[], ready: boolean, selfUid?: string) {
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!ready) return;

    if (seen.current === null) {
      seen.current = new Set(drops.map((drop) => drop.id));
      return;
    }

    drops.forEach((drop) => {
      if (seen.current!.has(drop.id)) return;
      seen.current!.add(drop.id);

      if (drop.addedBy === selfUid) return;

      toast.success(`Yeni drop: ${drop.itemName}`, {
        description: `${drop.addedByName} ekledi · ${formatGold(dropTotal(drop))}`,
      });
    });
  }, [drops, ready, selfUid]);
}
