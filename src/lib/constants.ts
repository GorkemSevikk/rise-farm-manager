import type { AppSettings, DropStatus, FarmStatus, PaymentStatus, UserRole } from "@/types";

export const APP_NAME = "Rise Farm Manager";
export const APP_DESCRIPTION =
  "Rise Online farm seanslarını, dropları, satış gelirlerini ve oyuncu paylarını yöneten klan paneli.";

export const COLLECTIONS = {
  users: "users",
  farms: "farms",
  /** farms/{farmId}/farmParticipants */
  farmParticipants: "farmParticipants",
  drops: "drops",
  payments: "payments",
  settings: "settings",
} as const;

export const SETTINGS_DOC_ID = "global";
/** Discord webhook gibi yalnızca yöneticilerin görebileceği alanlar */
export const SECRETS_DOC_ID = "secrets";

export const DEFAULT_CHARACTER_CLASSES = [
  "Savaşçı",
  "Okçu",
  "Büyücü",
  "Rahip",
  "Suikastçı",
];

export const DEFAULT_SERVERS = ["Elysium", "Olympos", "Valhalla", "Diğer"];

export const DEFAULT_MAPS = ["Topmuş", "Boss Alanı", "Zindan", "Etkinlik Alanı"];

export const DEFAULT_ITEM_CATEGORIES = [
  "Silah",
  "Zırh",
  "Aksesuar",
  "Materyal",
  "Kitap",
  "Tüketilebilir",
  "Diğer",
];

/** Ayarlar dokümanı henüz oluşturulmadığında kullanılan değerler */
export const DEFAULT_SETTINGS: AppSettings = {
  clanName: APP_NAME,
  discordEnabled: false,
  defaultExpensePercent: 0,
  maps: DEFAULT_MAPS,
  itemCategories: DEFAULT_ITEM_CATEGORIES,
  servers: DEFAULT_SERVERS,
  characterClasses: DEFAULT_CHARACTER_CLASSES,
  updatedAt: new Date(0),
  updatedBy: null,
};

export const FARM_STATUS_LABELS: Record<FarmStatus, string> = {
  planned: "Planlandı",
  active: "Devam ediyor",
  completed: "Tamamlandı",
  paid: "Ödendi",
};

export const FARM_STATUS_TONES: Record<FarmStatus, string> = {
  planned: "bg-muted text-muted-foreground",
  active: "bg-[var(--chart-2)]/15 text-[var(--chart-2)]",
  completed: "bg-primary/15 text-primary",
  paid: "bg-[var(--success)]/15 text-[var(--success)]",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Bekliyor",
  paid: "Ödendi",
};

export const DROP_STATUS_LABELS: Record<DropStatus, string> = {
  pending: "Satılmadı",
  sold: "Satıldı",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Yönetici",
  member: "Üye",
};

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
