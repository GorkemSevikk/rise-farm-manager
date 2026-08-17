import { NextResponse } from "next/server";
import { z } from "zod";

import { adminDb, isAdminConfigured, verifyRequest } from "@/lib/firebase/admin";
import { COLLECTIONS, SECRETS_DOC_ID, SETTINGS_DOC_ID } from "@/lib/constants";
import { formatGold } from "@/lib/format";

export const runtime = "nodejs";

const payloadSchema = z.object({
  farmTitle: z.string().min(1).max(120),
  mapName: z.string().max(120).default(""),
  itemName: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(100000),
  totalValue: z.number().min(0),
  players: z.array(z.string().max(60)).max(30).default([]),
  addedBy: z.string().max(60).default(""),
  screenshotUrl: z.string().url().nullish(),
});

export async function POST(request: Request) {
  if (!isAdminConfigured) {
    return NextResponse.json(
      { error: "Discord bildirimi için Firebase Admin ayarları eksik." },
      { status: 503 }
    );
  }

  const decodedToken = await verifyRequest(request);
  if (!decodedToken) {
    return NextResponse.json({ error: "Yetkisiz istek." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const db = adminDb();

  // İstek sahibi gerçekten klan üyesi mi?
  const userSnapshot = await db.collection(COLLECTIONS.users).doc(decodedToken.uid).get();
  if (!userSnapshot.exists || userSnapshot.get("active") === false) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 403 });
  }

  const [settingsSnapshot, secretsSnapshot] = await Promise.all([
    db.collection(COLLECTIONS.settings).doc(SETTINGS_DOC_ID).get(),
    db.collection(COLLECTIONS.settings).doc(SECRETS_DOC_ID).get(),
  ]);

  const webhookUrl: string =
    secretsSnapshot.get("discordWebhookUrl") || process.env.DISCORD_WEBHOOK_URL || "";
  const enabled = settingsSnapshot.get("discordEnabled") === true;

  if (!enabled || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    return NextResponse.json({ error: "Discord bildirimi kapalı." }, { status: 409 });
  }

  const drop = parsed.data;
  const embed = {
    title: "🔥 YENİ DROP",
    color: 0xe0a63c,
    fields: [
      { name: "Farm", value: drop.farmTitle || "-", inline: true },
      { name: "Harita", value: drop.mapName || "-", inline: true },
      { name: "Item", value: `${drop.itemName} x${drop.quantity}`, inline: false },
      { name: "Değer", value: formatGold(drop.totalValue), inline: true },
      {
        name: "Katılımcılar",
        value: drop.players.length ? drop.players.join(", ") : "-",
        inline: false,
      },
    ],
    footer: { text: `Ekleyen: ${drop.addedBy || "-"}` },
    timestamp: new Date().toISOString(),
    ...(drop.screenshotUrl ? { image: { url: drop.screenshotUrl } } : {}),
  };

  const discordResponse = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "Rise Farm Manager", embeds: [embed] }),
  });

  if (!discordResponse.ok) {
    return NextResponse.json(
      { error: "Discord webhook isteği başarısız." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
