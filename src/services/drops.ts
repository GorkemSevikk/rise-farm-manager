import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { dropConverter } from "@/lib/firebase/converters";
import { COLLECTIONS } from "@/lib/constants";
import { recalculateFarm } from "@/services/farms";
import { isDemoMode } from "@/lib/demo/mode";
import {
  demoCreateDrop,
  demoDeleteDrop,
  demoDrops,
  demoFarmDrops,
  demoSubscribe,
  demoUpdateDrop,
} from "@/lib/demo/store";
import type { AppUser, Drop, DropInput } from "@/types";

export function dropsCollection() {
  return collection(db, COLLECTIONS.drops).withConverter(dropConverter);
}

/** Tüm droplar - en yeni en üstte */
export function subscribeDrops(
  callback: (drops: Drop[]) => void,
  onError?: (error: Error) => void,
  max = 500
) {
  if (isDemoMode) {
    return demoSubscribe(demoDrops, callback);
  }

  const dropsQuery = query(dropsCollection(), orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(
    dropsQuery,
    (snapshot) => callback(snapshot.docs.map((docSnapshot) => docSnapshot.data())),
    (error) => onError?.(error)
  );
}

/**
 * Tek bir farmın dropları.
 * Sıralama istemci tarafında yapılır; böylece bileşik indeks gerekmez.
 */
export function subscribeFarmDrops(
  farmId: string,
  callback: (drops: Drop[]) => void,
  onError?: (error: Error) => void
) {
  if (isDemoMode) {
    return demoSubscribe(() => demoFarmDrops(farmId), callback);
  }

  const dropsQuery = query(dropsCollection(), where("farmId", "==", farmId));
  return onSnapshot(
    dropsQuery,
    (snapshot) =>
      callback(
        snapshot.docs
          .map((docSnapshot) => docSnapshot.data())
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      ),
    (error) => onError?.(error)
  );
}

export async function createDrop(input: DropInput, author: AppUser): Promise<string> {
  if (isDemoMode) {
    return demoCreateDrop(input, author);
  }

  const ref = await addDoc(collection(db, COLLECTIONS.drops), {
    farmId: input.farmId,
    farmTitle: input.farmTitle,
    itemName: input.itemName,
    category: input.category,
    quantity: input.quantity,
    estimatedValue: input.estimatedValue,
    soldPrice: input.soldPrice,
    sellerId: input.sellerId,
    sellerName: input.sellerName,
    saleDate: input.saleDate ? Timestamp.fromDate(input.saleDate) : null,
    screenshotUrl: input.screenshotUrl,
    addedBy: author.uid,
    addedByName: author.nickname || author.displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await recalculateFarm(input.farmId);
  return ref.id;
}

export async function updateDrop(dropId: string, farmId: string, input: Partial<DropInput>) {
  if (isDemoMode) {
    demoUpdateDrop(dropId, farmId, input);
    return;
  }

  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (input.itemName !== undefined) payload.itemName = input.itemName;
  if (input.category !== undefined) payload.category = input.category;
  if (input.quantity !== undefined) payload.quantity = input.quantity;
  if (input.estimatedValue !== undefined) payload.estimatedValue = input.estimatedValue;
  if (input.soldPrice !== undefined) payload.soldPrice = input.soldPrice;
  if (input.sellerId !== undefined) payload.sellerId = input.sellerId;
  if (input.sellerName !== undefined) payload.sellerName = input.sellerName;
  if (input.saleDate !== undefined) {
    payload.saleDate = input.saleDate ? Timestamp.fromDate(input.saleDate) : null;
  }
  if (input.screenshotUrl !== undefined) payload.screenshotUrl = input.screenshotUrl;

  await updateDoc(doc(db, COLLECTIONS.drops, dropId), payload);
  await recalculateFarm(farmId);
}

export async function deleteDrop(dropId: string, farmId: string) {
  if (isDemoMode) {
    demoDeleteDrop(dropId, farmId);
    return;
  }

  await deleteDoc(doc(db, COLLECTIONS.drops, dropId));
  await recalculateFarm(farmId);
}
