import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { paymentConverter } from "@/lib/firebase/converters";
import { COLLECTIONS } from "@/lib/constants";
import { isDemoMode } from "@/lib/demo/mode";
import {
  demoMarkAllPaid,
  demoPayments,
  demoSetPaymentStatus,
  demoSubscribe,
} from "@/lib/demo/store";
import type { AppUser, Farm, FarmParticipant, Payment, PaymentStatus } from "@/types";

export function paymentsCollection() {
  return collection(db, COLLECTIONS.payments).withConverter(paymentConverter);
}

export function subscribePayments(
  callback: (payments: Payment[]) => void,
  onError?: (error: Error) => void
) {
  if (isDemoMode) {
    return demoSubscribe(demoPayments, callback);
  }

  const paymentsQuery = query(paymentsCollection(), orderBy("createdAt", "desc"));
  return onSnapshot(
    paymentsQuery,
    (snapshot) => callback(snapshot.docs.map((docSnapshot) => docSnapshot.data())),
    (error) => onError?.(error)
  );
}

/**
 * Tek bir oyuncunun ödeme kayıtları.
 *
 * Güvenlik kuralları üyelerin yalnızca kendi kayıtlarını okumasına izin
 * verdiği için sorgu userId filtresi içermek zorundadır. Sıralama istemcide
 * yapılır; böylece bileşik indeks gerekmez.
 */
export function subscribeUserPayments(
  userId: string,
  callback: (payments: Payment[]) => void,
  onError?: (error: Error) => void
) {
  if (isDemoMode) {
    return demoSubscribe(
      () => demoPayments().filter((payment) => payment.userId === userId),
      callback
    );
  }

  const paymentsQuery = query(paymentsCollection(), where("userId", "==", userId));
  return onSnapshot(
    paymentsQuery,
    (snapshot) =>
      callback(
        snapshot.docs
          .map((docSnapshot) => docSnapshot.data())
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      ),
    (error) => onError?.(error)
  );
}

/** Ödeme kaydı kimliği: aynı farm + oyuncu için tek kayıt tutulur. */
export function paymentId(farmId: string, userId: string) {
  return `${farmId}_${userId}`;
}

/**
 * Bir katılımcının ödeme durumunu değiştirir.
 * Alt koleksiyondaki kayıt, farm dokümanındaki özet ve `payments` koleksiyonu
 * tek batch içinde güncellenir; böylece üç yerdeki durum hep aynı kalır.
 */
export async function setPaymentStatus(options: {
  farm: Farm;
  participant: FarmParticipant;
  status: PaymentStatus;
  actor: AppUser;
  note?: string;
}) {
  const { farm, participant, status, actor, note = "" } = options;

  if (isDemoMode) {
    demoSetPaymentStatus(farm.id, participant.userId, status, actor);
    return;
  }

  const paymentRef = doc(db, COLLECTIONS.payments, paymentId(farm.id, participant.userId));
  // `createdAt` yalnızca ilk kayıtta yazılmalı. Merge ile her çağrıda
  // serverTimestamp() gönderilirse kaydın oluşturulma zamanı kaybolur ve
  // ödeme geçmişi sıralaması bozulur.
  const existingPayment = await getDoc(paymentRef);

  const batch = writeBatch(db);

  batch.update(
    doc(db, COLLECTIONS.farms, farm.id, COLLECTIONS.farmParticipants, participant.userId),
    {
      paymentStatus: status,
      paidAt: status === "paid" ? serverTimestamp() : null,
      paidBy: status === "paid" ? actor.uid : null,
      note,
    }
  );

  const updatedShares = farm.shares.map((share) =>
    share.userId === participant.userId ? { ...share, paymentStatus: status } : share
  );

  const farmUpdate: Record<string, unknown> = {
    shares: updatedShares,
    updatedAt: serverTimestamp(),
  };

  // Farm durumu ödeme tablosuyla tutarlı kalsın: son bekleyen ödeme de
  // tamamlandığında "paid" olur, tamamlanmış bir ödeme geri alındığında
  // "paid" durumunda takılı kalmaz.
  const allPaid =
    updatedShares.length > 0 && updatedShares.every((share) => share.paymentStatus === "paid");

  if (allPaid) {
    farmUpdate.status = "paid";
  } else if (farm.status === "paid") {
    farmUpdate.status = "completed";
  }

  batch.update(doc(db, COLLECTIONS.farms, farm.id), farmUpdate);

  batch.set(
    paymentRef,
    {
      farmId: farm.id,
      farmTitle: farm.title,
      userId: participant.userId,
      userName: participant.nickname || participant.displayName,
      amount: participant.shareGold,
      status,
      note,
      markedBy: actor.uid,
      paidAt: status === "paid" ? serverTimestamp() : null,
      ...(existingPayment.exists() ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
}

/** Farmdaki tüm bekleyen ödemeleri tek seferde "ödendi" yapar. */
export async function markAllPaid(farm: Farm, participants: FarmParticipant[], actor: AppUser) {
  if (isDemoMode) {
    demoMarkAllPaid(farm.id, actor);
    return;
  }

  // Bu farm için hangi ödeme kayıtlarının zaten var olduğunu tek sorguyla
  // öğreniyoruz; böylece mevcut kayıtların createdAt değeri ezilmez.
  const existingSnapshot = await getDocs(
    query(collection(db, COLLECTIONS.payments), where("farmId", "==", farm.id))
  );
  const existingIds = new Set(existingSnapshot.docs.map((docSnapshot) => docSnapshot.id));

  const batch = writeBatch(db);

  participants.forEach((participant) => {
    batch.update(
      doc(db, COLLECTIONS.farms, farm.id, COLLECTIONS.farmParticipants, participant.userId),
      {
        paymentStatus: "paid",
        paidAt: serverTimestamp(),
        paidBy: actor.uid,
      }
    );

    const id = paymentId(farm.id, participant.userId);

    batch.set(
      doc(db, COLLECTIONS.payments, id),
      {
        farmId: farm.id,
        farmTitle: farm.title,
        userId: participant.userId,
        userName: participant.nickname || participant.displayName,
        amount: participant.shareGold,
        status: "paid",
        note: "",
        markedBy: actor.uid,
        paidAt: serverTimestamp(),
        ...(existingIds.has(id) ? {} : { createdAt: serverTimestamp() }),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  batch.update(doc(db, COLLECTIONS.farms, farm.id), {
    shares: farm.shares.map((share) => ({ ...share, paymentStatus: "paid" as const })),
    status: "paid",
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function getPayment(farmId: string, userId: string) {
  if (isDemoMode) {
    return demoPayments().find((payment) => payment.id === paymentId(farmId, userId)) ?? null;
  }

  const snapshot = await getDoc(
    doc(db, COLLECTIONS.payments, paymentId(farmId, userId)).withConverter(paymentConverter)
  );
  return snapshot.exists() ? snapshot.data() : null;
}