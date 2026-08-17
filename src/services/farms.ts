import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { farmConverter, participantConverter } from "@/lib/firebase/converters";
import { COLLECTIONS } from "@/lib/constants";
import { calculateFarmTotals, distributeShares } from "@/lib/profit";
import { dropConverter } from "@/lib/firebase/converters";
import { isDemoMode } from "@/lib/demo/mode";
import {
  demoAddParticipant,
  demoCreateFarm,
  demoDeleteFarm,
  demoFarm,
  demoFarms,
  demoParticipants,
  demoRecalculateFarm,
  demoRemoveParticipant,
  demoSubscribe,
  demoUpdateFarm,
  demoUpdateSharePercents,
} from "@/lib/demo/store";
import type {
  AppUser,
  Farm,
  FarmInput,
  FarmParticipant,
  ParticipantSummary,
} from "@/types";

export function farmsCollection() {
  return collection(db, COLLECTIONS.farms).withConverter(farmConverter);
}

export function farmDoc(farmId: string) {
  return doc(db, COLLECTIONS.farms, farmId).withConverter(farmConverter);
}

export function participantsCollection(farmId: string) {
  return collection(db, COLLECTIONS.farms, farmId, COLLECTIONS.farmParticipants).withConverter(
    participantConverter
  );
}

export function subscribeFarms(
  callback: (farms: Farm[]) => void,
  onError?: (error: Error) => void
) {
  if (isDemoMode) {
    return demoSubscribe(demoFarms, callback);
  }

  const farmsQuery = query(farmsCollection(), orderBy("date", "desc"));
  return onSnapshot(
    farmsQuery,
    (snapshot) => callback(snapshot.docs.map((docSnapshot) => docSnapshot.data())),
    (error) => onError?.(error)
  );
}

export function subscribeFarm(
  farmId: string,
  callback: (farm: Farm | null) => void,
  onError?: (error: Error) => void
) {
  if (isDemoMode) {
    return demoSubscribe(() => demoFarm(farmId), callback);
  }

  return onSnapshot(
    farmDoc(farmId),
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : null),
    (error) => onError?.(error)
  );
}

export function subscribeParticipants(
  farmId: string,
  callback: (participants: FarmParticipant[]) => void,
  onError?: (error: Error) => void
) {
  if (isDemoMode) {
    return demoSubscribe(() => demoParticipants(farmId), callback);
  }

  return onSnapshot(
    participantsCollection(farmId),
    (snapshot) =>
      callback(
        snapshot.docs
          .map((docSnapshot) => docSnapshot.data())
          .sort((a, b) => b.sharePercent - a.sharePercent)
      ),
    (error) => onError?.(error)
  );
}

export interface CreateFarmOptions {
  input: FarmInput;
  participants: { user: AppUser; sharePercent: number }[];
  author: AppUser;
}

export async function createFarm({ input, participants, author }: CreateFarmOptions) {
  if (isDemoMode) {
    return demoCreateFarm(
      {
        title: input.title,
        mapName: input.mapName,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        notes: input.notes,
        status: input.status,
        expensePercent: input.expensePercent,
      },
      participants,
      author
    );
  }

  const shares: ParticipantSummary[] = participants.map(({ user, sharePercent }) => ({
    userId: user.uid,
    name: user.nickname || user.displayName,
    photoURL: user.photoURL,
    sharePercent,
    shareGold: 0,
    paymentStatus: "pending" as const,
  }));

  const farmRef = await addDoc(collection(db, COLLECTIONS.farms), {
    title: input.title,
    mapName: input.mapName,
    date: Timestamp.fromDate(input.date),
    startTime: input.startTime,
    endTime: input.endTime,
    notes: input.notes,
    status: input.status,
    expensePercent: input.expensePercent,
    createdBy: author.uid,
    createdByName: author.nickname || author.displayName,
    participantIds: participants.map(({ user }) => user.uid),
    participantCount: participants.length,
    shares,
    grossGold: 0,
    expenseGold: 0,
    netGold: 0,
    dropCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const batch = writeBatch(db);
  participants.forEach(({ user, sharePercent }) => {
    batch.set(doc(db, COLLECTIONS.farms, farmRef.id, COLLECTIONS.farmParticipants, user.uid), {
      userId: user.uid,
      displayName: user.displayName,
      nickname: user.nickname || user.displayName,
      characterClass: user.characterClass,
      photoURL: user.photoURL,
      sharePercent,
      shareGold: 0,
      paymentStatus: "pending",
      paidAt: null,
      paidBy: null,
      note: "",
    });
  });
  await batch.commit();

  return farmRef.id;
}

export async function updateFarm(farmId: string, input: Partial<FarmInput>) {
  if (isDemoMode) {
    demoUpdateFarm(farmId, input);
    return;
  }

  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (input.title !== undefined) payload.title = input.title;
  if (input.mapName !== undefined) payload.mapName = input.mapName;
  if (input.date !== undefined) payload.date = Timestamp.fromDate(input.date);
  if (input.startTime !== undefined) payload.startTime = input.startTime;
  if (input.endTime !== undefined) payload.endTime = input.endTime;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.status !== undefined) payload.status = input.status;
  if (input.expensePercent !== undefined) payload.expensePercent = input.expensePercent;

  await updateDoc(doc(db, COLLECTIONS.farms, farmId), payload);

  if (input.expensePercent !== undefined) {
    await recalculateFarm(farmId);
  }
}

export async function deleteFarm(farmId: string) {
  if (isDemoMode) {
    demoDeleteFarm(farmId);
    return;
  }

  const [participants, drops] = await Promise.all([
    getDocs(participantsCollection(farmId)),
    getDocs(query(collection(db, COLLECTIONS.drops), where("farmId", "==", farmId))),
  ]);

  const batch = writeBatch(db);
  participants.forEach((participant) => batch.delete(participant.ref));
  drops.forEach((drop) => batch.delete(drop.ref));
  batch.delete(doc(db, COLLECTIONS.farms, farmId));
  await batch.commit();
}

export async function addParticipant(farmId: string, user: AppUser, sharePercent: number) {
  if (isDemoMode) {
    demoAddParticipant(farmId, user, sharePercent);
    return;
  }

  await setDoc(doc(db, COLLECTIONS.farms, farmId, COLLECTIONS.farmParticipants, user.uid), {
    userId: user.uid,
    displayName: user.displayName,
    nickname: user.nickname || user.displayName,
    characterClass: user.characterClass,
    photoURL: user.photoURL,
    sharePercent,
    shareGold: 0,
    paymentStatus: "pending",
    paidAt: null,
    paidBy: null,
    note: "",
  });

  await recalculateFarm(farmId);
}

export async function removeParticipant(farmId: string, userId: string) {
  if (isDemoMode) {
    demoRemoveParticipant(farmId, userId);
    return;
  }

  await deleteDoc(doc(db, COLLECTIONS.farms, farmId, COLLECTIONS.farmParticipants, userId));
  await recalculateFarm(farmId);
}

export async function updateSharePercents(farmId: string, percents: Record<string, number>) {
  if (isDemoMode) {
    demoUpdateSharePercents(farmId, percents);
    return;
  }

  const batch = writeBatch(db);
  Object.entries(percents).forEach(([userId, sharePercent]) => {
    batch.update(doc(db, COLLECTIONS.farms, farmId, COLLECTIONS.farmParticipants, userId), {
      sharePercent,
    });
  });
  await batch.commit();

  await recalculateFarm(farmId);
}

/**
 * Farmın toplamlarını ve oyuncu paylarını dropların güncel haline göre yeniden
 * hesaplar. Drop veya katılımcı değiştiren her işlemden sonra çağrılır.
 *
 * Hesap istemci tarafında yapılır çünkü proje yalnızca Firestore + Vercel
 * üzerinde çalışır (Cloud Functions gerektirmez). Yazma yetkisi güvenlik
 * kurallarıyla sınırlandırılmıştır.
 */
export async function recalculateFarm(farmId: string) {
  if (isDemoMode) {
    demoRecalculateFarm(farmId);
    return;
  }

  const farmRef = doc(db, COLLECTIONS.farms, farmId).withConverter(farmConverter);
  const [farmSnapshot, participantsSnapshot, dropsSnapshot] = await Promise.all([
    getDoc(farmRef),
    getDocs(participantsCollection(farmId)),
    getDocs(
      query(
        collection(db, COLLECTIONS.drops).withConverter(dropConverter),
        where("farmId", "==", farmId)
      )
    ),
  ]);

  if (!farmSnapshot.exists()) return;

  const farm = farmSnapshot.data();
  const drops = dropsSnapshot.docs.map((docSnapshot) => docSnapshot.data());
  const participants = participantsSnapshot.docs.map((docSnapshot) => docSnapshot.data());

  const totals = calculateFarmTotals(drops, farm.expensePercent);
  const shareMap = distributeShares(participants, totals.netGold);

  const batch = writeBatch(db);

  participants.forEach((participant) => {
    batch.update(
      doc(db, COLLECTIONS.farms, farmId, COLLECTIONS.farmParticipants, participant.userId),
      { shareGold: shareMap[participant.userId] ?? 0 }
    );
  });

  const shares: ParticipantSummary[] = participants.map((participant) => ({
    userId: participant.userId,
    name: participant.nickname || participant.displayName,
    photoURL: participant.photoURL,
    sharePercent: participant.sharePercent,
    shareGold: shareMap[participant.userId] ?? 0,
    paymentStatus: participant.paymentStatus,
  }));

  batch.update(doc(db, COLLECTIONS.farms, farmId), {
    grossGold: totals.grossGold,
    expenseGold: totals.expenseGold,
    netGold: totals.netGold,
    dropCount: totals.dropCount,
    participantIds: participants.map((participant) => participant.userId),
    participantCount: participants.length,
    shares,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}
