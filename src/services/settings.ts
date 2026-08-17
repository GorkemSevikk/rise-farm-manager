import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { settingsConverter } from "@/lib/firebase/converters";
import { COLLECTIONS, DEFAULT_SETTINGS, SECRETS_DOC_ID, SETTINGS_DOC_ID } from "@/lib/constants";
import { isDemoMode } from "@/lib/demo/mode";
import {
  demoSaveSettings,
  demoSaveWebhookUrl,
  demoSettings,
  demoSubscribe,
  demoWebhookUrl,
} from "@/lib/demo/store";
import type { AppSettings } from "@/types";

function settingsDoc() {
  return doc(db, COLLECTIONS.settings, SETTINGS_DOC_ID).withConverter(settingsConverter);
}

export function subscribeSettings(
  callback: (settings: AppSettings) => void,
  onError?: (error: Error) => void
) {
  if (isDemoMode) {
    return demoSubscribe(demoSettings, callback);
  }

  return onSnapshot(
    settingsDoc(),
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : DEFAULT_SETTINGS),
    (error) => {
      callback(DEFAULT_SETTINGS);
      onError?.(error);
    }
  );
}

export async function getSettings(): Promise<AppSettings> {
  if (isDemoMode) return demoSettings();

  try {
    const snapshot = await getDoc(settingsDoc());
    return snapshot.exists() ? snapshot.data() : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(input: Partial<AppSettings>, actorId: string) {
  if (isDemoMode) {
    demoSaveSettings(input, actorId);
    return;
  }

  const payload: Record<string, unknown> = { updatedAt: serverTimestamp(), updatedBy: actorId };

  if (input.clanName !== undefined) payload.clanName = input.clanName;
  if (input.discordEnabled !== undefined) payload.discordEnabled = input.discordEnabled;
  if (input.defaultExpensePercent !== undefined) {
    payload.defaultExpensePercent = input.defaultExpensePercent;
  }
  if (input.maps !== undefined) payload.maps = input.maps;
  if (input.itemCategories !== undefined) payload.itemCategories = input.itemCategories;
  if (input.servers !== undefined) payload.servers = input.servers;
  if (input.characterClasses !== undefined) payload.characterClasses = input.characterClasses;

  await setDoc(doc(db, COLLECTIONS.settings, SETTINGS_DOC_ID), payload, { merge: true });
}

/**
 * Discord webhook adresi gizli dokümanda tutulur; güvenlik kuralları yalnızca
 * yöneticilere okuma/yazma izni verir. Üye hesabıyla çağrıldığında boş döner.
 */
export async function getDiscordWebhookUrl(): Promise<string> {
  if (isDemoMode) return demoWebhookUrl();

  try {
    const snapshot = await getDoc(doc(db, COLLECTIONS.settings, SECRETS_DOC_ID));
    const value = snapshot.get("discordWebhookUrl");
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

export async function saveDiscordWebhookUrl(url: string, actorId: string) {
  if (isDemoMode) {
    demoSaveWebhookUrl(url);
    return;
  }

  await setDoc(
    doc(db, COLLECTIONS.settings, SECRETS_DOC_ID),
    { discordWebhookUrl: url, updatedAt: serverTimestamp(), updatedBy: actorId },
    { merge: true }
  );
}
