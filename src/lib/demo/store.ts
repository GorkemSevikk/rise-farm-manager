/**
 * Demo modu veri deposu.
 *
 * Firebase yerine bellekte tutulan basit bir store; abonelik mantığı Firestore
 * `onSnapshot` davranışını taklit eder, böylece sayfalar ve hook'lar hiç
 * değişmeden çalışır. Hesaplamalar gerçek uygulama fonksiyonlarıyla (lib/profit)
 * yapıldığı için demo, üretimdeki sonuçların aynısını üretir.
 *
 * Veriler sekme yenilenene kadar yaşar; kalıcı depolama yoktur.
 */
import { calculateFarmTotals, distributeShares, equalPercentages } from "@/lib/profit";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import type {
  AppSettings,
  AppUser,
  Drop,
  Farm,
  FarmParticipant,
  ParticipantSummary,
  Payment,
  PaymentStatus,
  UserRole,
} from "@/types";

interface DemoState {
  currentUserId: string;
  users: AppUser[];
  farms: Farm[];
  participants: Record<string, FarmParticipant[]>;
  drops: Drop[];
  payments: Payment[];
  settings: AppSettings;
  webhookUrl: string;
}

type Listener = () => void;

const listeners = new Set<Listener>();
// idCounter, createInitialState() içinde kullanıldığı için state'ten önce tanımlı olmalı.
let idCounter = 0;
let state: DemoState = createInitialState();

function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function daysAgo(days: number, hour = 21) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function emit() {
  listeners.forEach((listener) => listener());
}

/** Firestore `onSnapshot` benzeri abonelik: anında bir kez, sonra her değişimde çağırır. */
export function demoSubscribe<T>(read: () => T, callback: (value: T) => void) {
  const listener = () => callback(read());
  listeners.add(listener);
  listener();
  return () => {
    listeners.delete(listener);
  };
}

// ------------------------------------------------------------------ okuma

export function demoCurrentUser(): AppUser {
  return state.users.find((user) => user.uid === state.currentUserId) ?? state.users[0];
}

export function demoUsers(): AppUser[] {
  return [...state.users].sort((a, b) => a.displayName.localeCompare(b.displayName, "tr"));
}

export function demoFarms(): Farm[] {
  return [...state.farms].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function demoFarm(farmId: string): Farm | null {
  return state.farms.find((farm) => farm.id === farmId) ?? null;
}

export function demoParticipants(farmId: string): FarmParticipant[] {
  return [...(state.participants[farmId] ?? [])].sort((a, b) => b.sharePercent - a.sharePercent);
}

export function demoDrops(): Drop[] {
  return [...state.drops].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function demoFarmDrops(farmId: string): Drop[] {
  return demoDrops().filter((drop) => drop.farmId === farmId);
}

export function demoPayments(): Payment[] {
  return [...state.payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function demoSettings(): AppSettings {
  return state.settings;
}

export function demoWebhookUrl(): string {
  return state.webhookUrl;
}

// ------------------------------------------------------------------ yazma

export function demoSetRole(role: UserRole) {
  state.users = state.users.map((user) =>
    user.uid === state.currentUserId ? { ...user, role } : user
  );
  emit();
}

export function demoReset() {
  state = createInitialState();
  emit();
}

export function demoUpdateProfile(
  uid: string,
  input: Pick<AppUser, "nickname" | "characterClass" | "server" | "discord">
) {
  state.users = state.users.map((user) =>
    user.uid === uid ? { ...user, ...input, updatedAt: new Date() } : user
  );
  syncUserNames(uid);
  emit();
}

export function demoSetUserRole(uid: string, role: UserRole) {
  state.users = state.users.map((user) => (user.uid === uid ? { ...user, role } : user));
  emit();
}

export function demoSetUserActive(uid: string, active: boolean) {
  state.users = state.users.map((user) => (user.uid === uid ? { ...user, active } : user));
  emit();
}

export function demoCreateFarm(
  input: Omit<Farm, "id" | "createdAt" | "updatedAt" | "shares" | "participantIds" | "participantCount" | "grossGold" | "expenseGold" | "netGold" | "dropCount" | "createdBy" | "createdByName">,
  participants: { user: AppUser; sharePercent: number }[],
  author: AppUser
): string {
  const id = nextId("farm");

  state.participants[id] = participants.map(({ user, sharePercent }) => ({
    id: user.uid,
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
  }));

  state.farms = [
    ...state.farms,
    {
      ...input,
      id,
      createdBy: author.uid,
      createdByName: author.nickname || author.displayName,
      participantIds: participants.map(({ user }) => user.uid),
      participantCount: participants.length,
      shares: [],
      grossGold: 0,
      expenseGold: 0,
      netGold: 0,
      dropCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  demoRecalculateFarm(id);
  return id;
}

export function demoUpdateFarm(farmId: string, input: Partial<Farm>) {
  state.farms = state.farms.map((farm) =>
    farm.id === farmId ? { ...farm, ...input, updatedAt: new Date() } : farm
  );
  demoRecalculateFarm(farmId);
}

export function demoDeleteFarm(farmId: string) {
  state.farms = state.farms.filter((farm) => farm.id !== farmId);
  state.drops = state.drops.filter((drop) => drop.farmId !== farmId);
  state.payments = state.payments.filter((payment) => payment.farmId !== farmId);
  delete state.participants[farmId];
  emit();
}

export function demoAddParticipant(farmId: string, user: AppUser, sharePercent: number) {
  const current = state.participants[farmId] ?? [];
  state.participants[farmId] = [
    ...current.filter((item) => item.userId !== user.uid),
    {
      id: user.uid,
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
    },
  ];
  demoRecalculateFarm(farmId);
}

export function demoRemoveParticipant(farmId: string, userId: string) {
  state.participants[farmId] = (state.participants[farmId] ?? []).filter(
    (item) => item.userId !== userId
  );
  demoRecalculateFarm(farmId);
}

export function demoUpdateSharePercents(farmId: string, percents: Record<string, number>) {
  state.participants[farmId] = (state.participants[farmId] ?? []).map((item) =>
    percents[item.userId] === undefined
      ? item
      : { ...item, sharePercent: percents[item.userId] }
  );
  demoRecalculateFarm(farmId);
}

export function demoCreateDrop(
  input: Omit<Drop, "id" | "status" | "addedBy" | "addedByName" | "createdAt" | "updatedAt">,
  author: AppUser
): string {
  const id = nextId("drop");
  state.drops = [
    ...state.drops,
    {
      ...input,
      id,
      status: input.soldPrice !== null ? "sold" : "pending",
      addedBy: author.uid,
      addedByName: author.nickname || author.displayName,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  demoRecalculateFarm(input.farmId);
  return id;
}

export function demoUpdateDrop(dropId: string, farmId: string, input: Partial<Drop>) {
  state.drops = state.drops.map((drop) =>
    drop.id === dropId
      ? {
          ...drop,
          ...input,
          status:
            (input.soldPrice === undefined ? drop.soldPrice : input.soldPrice) !== null
              ? "sold"
              : "pending",
          updatedAt: new Date(),
        }
      : drop
  );
  demoRecalculateFarm(farmId);
}

export function demoDeleteDrop(dropId: string, farmId: string) {
  state.drops = state.drops.filter((drop) => drop.id !== dropId);
  demoRecalculateFarm(farmId);
}

export function demoSetPaymentStatus(
  farmId: string,
  userId: string,
  status: PaymentStatus,
  actor: AppUser
) {
  const participant = (state.participants[farmId] ?? []).find((item) => item.userId === userId);
  const farm = demoFarm(farmId);
  if (!participant || !farm) return;

  state.participants[farmId] = (state.participants[farmId] ?? []).map((item) =>
    item.userId === userId
      ? {
          ...item,
          paymentStatus: status,
          paidAt: status === "paid" ? new Date() : null,
          paidBy: status === "paid" ? actor.uid : null,
        }
      : item
  );

  upsertPayment(farm, participant, status, actor);
  demoRecalculateFarm(farmId);
}

export function demoMarkAllPaid(farmId: string, actor: AppUser) {
  const farm = demoFarm(farmId);
  if (!farm) return;

  (state.participants[farmId] ?? []).forEach((participant) => {
    upsertPayment(farm, participant, "paid", actor);
  });

  state.participants[farmId] = (state.participants[farmId] ?? []).map((item) => ({
    ...item,
    paymentStatus: "paid",
    paidAt: new Date(),
    paidBy: actor.uid,
  }));

  state.farms = state.farms.map((item) =>
    item.id === farmId ? { ...item, status: "paid" } : item
  );

  demoRecalculateFarm(farmId);
}

export function demoSaveSettings(input: Partial<AppSettings>, actorId: string) {
  state.settings = {
    ...state.settings,
    ...input,
    updatedAt: new Date(),
    updatedBy: actorId,
  };
  emit();
}

export function demoSaveWebhookUrl(url: string) {
  state.webhookUrl = url;
  emit();
}

/** Toplamları ve payları gerçek hesaplama fonksiyonlarıyla yeniden üretir. */
export function demoRecalculateFarm(farmId: string) {
  const farm = demoFarm(farmId);
  if (!farm) return;

  const drops = state.drops.filter((drop) => drop.farmId === farmId);
  const participants = state.participants[farmId] ?? [];
  const totals = calculateFarmTotals(drops, farm.expensePercent);
  const shareMap = distributeShares(participants, totals.netGold);

  state.participants[farmId] = participants.map((participant) => ({
    ...participant,
    shareGold: shareMap[participant.userId] ?? 0,
  }));

  const shares: ParticipantSummary[] = state.participants[farmId].map((participant) => ({
    userId: participant.userId,
    name: participant.nickname || participant.displayName,
    photoURL: participant.photoURL,
    sharePercent: participant.sharePercent,
    shareGold: participant.shareGold,
    paymentStatus: participant.paymentStatus,
  }));

  state.farms = state.farms.map((item) =>
    item.id === farmId
      ? {
          ...item,
          grossGold: totals.grossGold,
          expenseGold: totals.expenseGold,
          netGold: totals.netGold,
          dropCount: totals.dropCount,
          participantIds: shares.map((share) => share.userId),
          participantCount: shares.length,
          shares,
          updatedAt: new Date(),
        }
      : item
  );

  emit();
}

function upsertPayment(
  farm: Farm,
  participant: FarmParticipant,
  status: PaymentStatus,
  actor: AppUser
) {
  const id = `${farm.id}_${participant.userId}`;
  const record: Payment = {
    id,
    farmId: farm.id,
    farmTitle: farm.title,
    userId: participant.userId,
    userName: participant.nickname || participant.displayName,
    amount: participant.shareGold,
    status,
    note: "",
    markedBy: actor.uid,
    paidAt: status === "paid" ? new Date() : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  state.payments = [...state.payments.filter((payment) => payment.id !== id), record];
}

/** Profil güncellendiğinde katılımcı kayıtlarındaki ada da yansıt. */
function syncUserNames(uid: string) {
  const user = state.users.find((item) => item.uid === uid);
  if (!user) return;

  const label = user.nickname || user.displayName;

  Object.keys(state.participants).forEach((farmId) => {
    state.participants[farmId] = state.participants[farmId].map((participant) =>
      participant.userId === uid
        ? {
            ...participant,
            nickname: label,
            displayName: user.displayName,
            characterClass: user.characterClass,
          }
        : participant
    );
  });

  state.farms = state.farms.map((farm) => ({
    ...farm,
    shares: farm.shares.map((share) =>
      share.userId === uid ? { ...share, name: label } : share
    ),
  }));
}

// ------------------------------------------------------------------ örnek veri

function createInitialState(): DemoState {
  idCounter = 0;

  const users: AppUser[] = [
    demoUser("demo-1", "Görkem Yılmaz", "Rise", "Savaşçı", "gorkem#1234", "admin"),
    demoUser("demo-2", "Ahmet Kaya", "AhmetPro", "Okçu", "ahmet#2201"),
    demoUser("demo-3", "Mehmet Demir", "MehmetX", "Büyücü", "mehmet#7788"),
    demoUser("demo-4", "Ali Şahin", "AliRise", "Rahip", ""),
    demoUser("demo-5", "Can Aydın", "CanTheKing", "Suikastçı", "can#0451"),
    demoUser("demo-6", "Elif Yorulmaz", "ElifHeal", "Rahip", "elif#5150"),
  ];

  const state: DemoState = {
    currentUserId: "demo-1",
    users,
    farms: [],
    participants: {},
    drops: [],
    payments: [],
    settings: {
      ...DEFAULT_SETTINGS,
      clanName: "Rise Kardeşliği",
      defaultExpensePercent: 5,
      updatedAt: daysAgo(20),
      updatedBy: "demo-1",
    },
    webhookUrl: "",
  };

  const seed: {
    title: string;
    mapName: string;
    date: Date;
    status: Farm["status"];
    expensePercent: number;
    notes: string;
    memberIds: string[];
    drops: {
      itemName: string;
      category: string;
      quantity: number;
      estimated: number;
      sold: number | null;
      sellerIndex?: number;
    }[];
    allPaid?: boolean;
  }[] = [
    {
      title: "Topmuş akşam farmı",
      mapName: "Topmuş",
      date: daysAgo(2),
      status: "active",
      expensePercent: 5,
      notes: "Boss saat 22:30'da spawn oldu, iki tur attık.",
      memberIds: ["demo-1", "demo-2", "demo-3", "demo-5"],
      drops: [
        {
          itemName: "Blue Dragon Scale",
          category: "Materyal",
          quantity: 2,
          estimated: 45_000_000,
          sold: 50_000_000,
          sellerIndex: 1,
        },
        {
          itemName: "Işık Kolyesi",
          category: "Aksesuar",
          quantity: 1,
          estimated: 30_000_000,
          sold: null,
        },
        {
          itemName: "Ejder Kılıcı +7",
          category: "Silah",
          quantity: 1,
          estimated: 120_000_000,
          sold: 135_000_000,
          sellerIndex: 0,
        },
      ],
    },
    {
      title: "Zindan temizliği",
      mapName: "Zindan",
      date: daysAgo(12),
      status: "completed",
      expensePercent: 10,
      notes: "Pot masrafı yüksekti, kesinti %10 uygulandı.",
      memberIds: ["demo-1", "demo-3", "demo-4", "demo-6"],
      drops: [
        {
          itemName: "Kadim Zırh Parçası",
          category: "Zırh",
          quantity: 4,
          estimated: 18_000_000,
          sold: 22_000_000,
          sellerIndex: 2,
        },
        {
          itemName: "Beceri Kitabı: Fırtına",
          category: "Kitap",
          quantity: 1,
          estimated: 60_000_000,
          sold: 58_000_000,
          sellerIndex: 0,
        },
      ],
    },
    {
      title: "Hafta sonu boss turu",
      mapName: "Boss Alanı",
      date: daysAgo(38),
      status: "paid",
      expensePercent: 5,
      notes: "",
      memberIds: ["demo-1", "demo-2", "demo-4", "demo-5", "demo-6"],
      allPaid: true,
      drops: [
        {
          itemName: "Kanatlı Miğfer",
          category: "Zırh",
          quantity: 1,
          estimated: 85_000_000,
          sold: 92_000_000,
          sellerIndex: 1,
        },
        {
          itemName: "Ateş Yüzüğü",
          category: "Aksesuar",
          quantity: 3,
          estimated: 25_000_000,
          sold: 27_500_000,
          sellerIndex: 3,
        },
        {
          itemName: "Nadir Kristal",
          category: "Materyal",
          quantity: 10,
          estimated: 4_000_000,
          sold: 4_500_000,
          sellerIndex: 0,
        },
      ],
    },
    {
      title: "Sabah erken farm",
      mapName: "Topmuş",
      date: daysAgo(64),
      status: "paid",
      expensePercent: 0,
      notes: "Kısa ama verimli seans.",
      memberIds: ["demo-1", "demo-3", "demo-5"],
      allPaid: true,
      drops: [
        {
          itemName: "Gölge Pelerini",
          category: "Zırh",
          quantity: 1,
          estimated: 70_000_000,
          sold: 74_000_000,
          sellerIndex: 2,
        },
        {
          itemName: "Şifa İksiri (Yığın)",
          category: "Tüketilebilir",
          quantity: 20,
          estimated: 500_000,
          sold: 600_000,
          sellerIndex: 1,
        },
      ],
    },
  ];

  seed.forEach((entry) => {
    const farmId = nextId("farm");
    const members = entry.memberIds
      .map((id) => users.find((user) => user.uid === id))
      .filter((user): user is AppUser => Boolean(user));
    const percents = equalPercentages(members.length);

    state.participants[farmId] = members.map((user, index) => ({
      id: user.uid,
      userId: user.uid,
      displayName: user.displayName,
      nickname: user.nickname,
      characterClass: user.characterClass,
      photoURL: user.photoURL,
      sharePercent: percents[index] ?? 0,
      shareGold: 0,
      paymentStatus: entry.allPaid ? "paid" : "pending",
      paidAt: entry.allPaid ? entry.date : null,
      paidBy: entry.allPaid ? "demo-1" : null,
      note: "",
    }));

    state.farms.push({
      id: farmId,
      title: entry.title,
      mapName: entry.mapName,
      date: entry.date,
      startTime: "20:00",
      endTime: "23:30",
      notes: entry.notes,
      status: entry.status,
      createdBy: "demo-1",
      createdByName: "Rise",
      participantIds: members.map((user) => user.uid),
      participantCount: members.length,
      shares: [],
      expensePercent: entry.expensePercent,
      grossGold: 0,
      expenseGold: 0,
      netGold: 0,
      dropCount: 0,
      createdAt: entry.date,
      updatedAt: entry.date,
    });

    entry.drops.forEach((drop) => {
      const seller =
        drop.sellerIndex !== undefined ? members[drop.sellerIndex] ?? null : null;

      state.drops.push({
        id: nextId("drop"),
        farmId,
        farmTitle: entry.title,
        itemName: drop.itemName,
        category: drop.category,
        quantity: drop.quantity,
        estimatedValue: drop.estimated,
        soldPrice: drop.sold,
        sellerId: seller?.uid ?? null,
        sellerName: seller ? seller.nickname : "",
        saleDate: drop.sold !== null ? entry.date : null,
        screenshotUrl: null,
        status: drop.sold !== null ? "sold" : "pending",
        addedBy: members[0]?.uid ?? "demo-1",
        addedByName: members[0]?.nickname ?? "Rise",
        createdAt: entry.date,
        updatedAt: entry.date,
      });
    });
  });

  // Toplamları ve payları başlangıçta bir kez hesapla.
  state.farms.forEach((farm) => {
    const drops = state.drops.filter((drop) => drop.farmId === farm.id);
    const participants = state.participants[farm.id] ?? [];
    const totals = calculateFarmTotals(drops, farm.expensePercent);
    const shareMap = distributeShares(participants, totals.netGold);

    state.participants[farm.id] = participants.map((participant) => ({
      ...participant,
      shareGold: shareMap[participant.userId] ?? 0,
    }));

    farm.grossGold = totals.grossGold;
    farm.expenseGold = totals.expenseGold;
    farm.netGold = totals.netGold;
    farm.dropCount = totals.dropCount;
    farm.shares = state.participants[farm.id].map((participant) => ({
      userId: participant.userId,
      name: participant.nickname || participant.displayName,
      photoURL: participant.photoURL,
      sharePercent: participant.sharePercent,
      shareGold: participant.shareGold,
      paymentStatus: participant.paymentStatus,
    }));

    if (farm.status === "paid") {
      state.participants[farm.id].forEach((participant) => {
        state.payments.push({
          id: `${farm.id}_${participant.userId}`,
          farmId: farm.id,
          farmTitle: farm.title,
          userId: participant.userId,
          userName: participant.nickname,
          amount: participant.shareGold,
          status: "paid",
          note: "",
          markedBy: "demo-1",
          paidAt: farm.date,
          createdAt: farm.date,
          updatedAt: farm.date,
        });
      });
    }
  });

  return state;
}

function demoUser(
  uid: string,
  displayName: string,
  nickname: string,
  characterClass: string,
  discord: string,
  role: UserRole = "member"
): AppUser {
  return {
    uid,
    displayName,
    email: `${nickname.toLowerCase()}@demo.local`,
    photoURL: null,
    nickname,
    characterClass,
    server: "Elysium",
    discord,
    role,
    active: true,
    joinedAt: daysAgo(90),
    updatedAt: daysAgo(10),
  };
}
