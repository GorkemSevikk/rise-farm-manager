import {
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from "firebase/firestore";

import type {
  AppSettings,
  AppUser,
  Drop,
  Farm,
  FarmParticipant,
  Payment,
} from "@/types";

/**
 * Firestore Timestamp -> Date dönüşümü.
 * `serverTimestamp()` ile yazılan alanlar, sunucu onayı gelene kadar yerel
 * snapshot'ta null döner; bu durumda geçici olarak şimdiki zamanı kullanırız.
 */
function toDate(value: unknown, fallback: Date = new Date()): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function toNullableDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export const userConverter: FirestoreDataConverter<AppUser> = {
  toFirestore(user) {
    const { uid: _uid, joinedAt: _joinedAt, updatedAt: _updatedAt, ...rest } = user as AppUser;
    return rest as DocumentData;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): AppUser {
    const data = snapshot.data(options) ?? {};
    return {
      uid: snapshot.id,
      displayName: str(data.displayName, "İsimsiz oyuncu"),
      email: str(data.email),
      photoURL: (data.photoURL as string | null) ?? null,
      nickname: str(data.nickname),
      characterClass: str(data.characterClass),
      server: str(data.server),
      discord: str(data.discord),
      role:
        data.role === "admin" || data.role === "moderator" || data.role === "member"
          ? data.role
          : "member",
      // Alanı olmayan eski kayıtlar onaylı sayılır; aksi halde onay akışı
      // devreye girdiğinde mevcut üyelerin tamamı dışarıda kalırdı.
      approved: data.approved !== false,
      active: data.active !== false,
      joinedAt: toDate(data.joinedAt),
      updatedAt: toDate(data.updatedAt),
    };
  },
};

export const farmConverter: FirestoreDataConverter<Farm> = {
  toFirestore(farm) {
    const { id: _id, ...rest } = farm as Farm;
    return rest as DocumentData;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): Farm {
    const data = snapshot.data(options) ?? {};
    return {
      id: snapshot.id,
      title: str(data.title, "İsimsiz farm"),
      mapName: str(data.mapName),
      date: toDate(data.date),
      startTime: str(data.startTime),
      endTime: str(data.endTime),
      notes: str(data.notes),
      status: (["planned", "active", "completed", "paid"] as const).includes(data.status)
        ? data.status
        : "active",
      createdBy: str(data.createdBy),
      createdByName: str(data.createdByName),
      participantIds: Array.isArray(data.participantIds) ? (data.participantIds as string[]) : [],
      participantCount: num(data.participantCount),
      shares: Array.isArray(data.shares)
        ? (data.shares as DocumentData[]).map((share) => ({
            userId: str(share.userId),
            name: str(share.name),
            photoURL: (share.photoURL as string | null) ?? null,
            sharePercent: num(share.sharePercent),
            shareGold: num(share.shareGold),
            paymentStatus: share.paymentStatus === "paid" ? ("paid" as const) : ("pending" as const),
          }))
        : [],
      expensePercent: num(data.expensePercent),
      grossGold: num(data.grossGold),
      expenseGold: num(data.expenseGold),
      netGold: num(data.netGold),
      dropCount: num(data.dropCount),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  },
};

export const participantConverter: FirestoreDataConverter<FarmParticipant> = {
  toFirestore(participant) {
    const { id: _id, ...rest } = participant as FarmParticipant;
    return rest as DocumentData;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): FarmParticipant {
    const data = snapshot.data(options) ?? {};
    return {
      id: snapshot.id,
      userId: str(data.userId, snapshot.id),
      displayName: str(data.displayName),
      nickname: str(data.nickname),
      characterClass: str(data.characterClass),
      photoURL: (data.photoURL as string | null) ?? null,
      sharePercent: num(data.sharePercent),
      shareGold: num(data.shareGold),
      paymentStatus: data.paymentStatus === "paid" ? "paid" : "pending",
      paidAt: toNullableDate(data.paidAt),
      paidBy: (data.paidBy as string | null) ?? null,
      note: str(data.note),
    };
  },
};

export const dropConverter: FirestoreDataConverter<Drop> = {
  toFirestore(drop) {
    const { id: _id, ...rest } = drop as Drop;
    return rest as DocumentData;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): Drop {
    const data = snapshot.data(options) ?? {};
    const soldPrice =
      typeof data.soldPrice === "number" && Number.isFinite(data.soldPrice)
        ? data.soldPrice
        : null;

    return {
      id: snapshot.id,
      farmId: str(data.farmId),
      farmTitle: str(data.farmTitle),
      itemName: str(data.itemName),
      category: str(data.category, "Diğer"),
      quantity: num(data.quantity, 1),
      estimatedValue: num(data.estimatedValue),
      soldPrice,
      sellerId: (data.sellerId as string | null) ?? null,
      sellerName: str(data.sellerName),
      saleDate: toNullableDate(data.saleDate),
      screenshotUrl: (data.screenshotUrl as string | null) ?? null,
      status: soldPrice !== null ? "sold" : "pending",
      addedBy: str(data.addedBy),
      addedByName: str(data.addedByName),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  },
};

export const paymentConverter: FirestoreDataConverter<Payment> = {
  toFirestore(payment) {
    const { id: _id, ...rest } = payment as Payment;
    return rest as DocumentData;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): Payment {
    const data = snapshot.data(options) ?? {};
    return {
      id: snapshot.id,
      farmId: str(data.farmId),
      farmTitle: str(data.farmTitle),
      userId: str(data.userId),
      userName: str(data.userName),
      amount: num(data.amount),
      status: data.status === "paid" ? "paid" : "pending",
      note: str(data.note),
      markedBy: (data.markedBy as string | null) ?? null,
      paidAt: toNullableDate(data.paidAt),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  },
};

export const settingsConverter: FirestoreDataConverter<AppSettings> = {
  toFirestore(settings) {
    return settings as DocumentData;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): AppSettings {
    const data = snapshot.data(options) ?? {};
    return {
      clanName: str(data.clanName, "Rise Farm Manager"),
      discordEnabled: data.discordEnabled === true,
      defaultExpensePercent: num(data.defaultExpensePercent),
      maps: Array.isArray(data.maps) ? (data.maps as string[]) : [],
      itemCategories: Array.isArray(data.itemCategories)
        ? (data.itemCategories as string[])
        : [],
      servers: Array.isArray(data.servers) ? (data.servers as string[]) : [],
      characterClasses: Array.isArray(data.characterClasses)
        ? (data.characterClasses as string[])
        : [],
      updatedAt: toDate(data.updatedAt),
      updatedBy: (data.updatedBy as string | null) ?? null,
    };
  },
};
