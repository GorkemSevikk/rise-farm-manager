import { auth } from "@/lib/firebase/client";
import { isDemoMode } from "@/lib/demo/mode";

export interface DropNotification {
  farmTitle: string;
  mapName: string;
  itemName: string;
  quantity: number;
  totalValue: number;
  players: string[];
  addedBy: string;
  screenshotUrl?: string | null;
}

/**
 * Discord bildirimini sunucu tarafındaki route üzerinden gönderir.
 * Webhook adresi hiçbir zaman tarayıcıya inmez.
 *
 * Bildirim gönderilemezse hata yutulur: drop kaydı zaten oluşmuştur ve
 * kullanıcının akışını kesmek istemeyiz.
 */
export async function notifyDrop(payload: DropNotification): Promise<boolean> {
  if (isDemoMode) return false;

  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return false;

    const response = await fetch("/api/discord", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch {
    return false;
  }
}
