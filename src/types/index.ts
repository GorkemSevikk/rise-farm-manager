/**
 * Rise Farm Manager - uygulama genelinde kullanılan veri modelleri.
 *
 * Firestore'da tarihler `Timestamp` olarak saklanır; converter katmanı
 * (src/lib/firebase/converters.ts) bunları uygulama tarafında `Date` nesnesine
 * çevirir. Bu sayede bileşenler Firestore tiplerine bağımlı kalmaz.
 */

export type UserRole = "admin" | "member";

export type FarmStatus = "planned" | "active" | "completed" | "paid";

export type PaymentStatus = "pending" | "paid";

export type DropStatus = "pending" | "sold";

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  /** Rise Online karakter adı */
  nickname: string;
  characterClass: string;
  server: string;
  discord: string;
  role: UserRole;
  active: boolean;
  joinedAt: Date;
  updatedAt: Date;
}

export type UserProfileInput = Pick<
  AppUser,
  "nickname" | "characterClass" | "server" | "discord"
>;

/**
 * Farm dokümanı içinde tutulan hafif katılımcı özeti.
 * Ayrıntılı kayıt `farms/{id}/farmParticipants` alt koleksiyonundadır; buradaki
 * kopya liste ve istatistik ekranlarının tek sorguyla çalışmasını sağlar.
 * İki kayıt aynı batch içinde yazıldığı için tutarlı kalır.
 */
export interface ParticipantSummary {
  userId: string;
  name: string;
  photoURL: string | null;
  sharePercent: number;
  shareGold: number;
  paymentStatus: PaymentStatus;
}

export interface Farm {
  id: string;
  title: string;
  mapName: string;
  date: Date;
  /** "20:00" biçiminde yerel saat */
  startTime: string;
  endTime: string;
  notes: string;
  status: FarmStatus;
  createdBy: string;
  createdByName: string;
  /** Katılımcı uid listesi - array-contains sorguları için denormalize edilir */
  participantIds: string[];
  participantCount: number;
  shares: ParticipantSummary[];
  /** Ortak kasa / gider kesintisi yüzdesi */
  expensePercent: number;
  grossGold: number;
  expenseGold: number;
  netGold: number;
  dropCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type FarmInput = Pick<
  Farm,
  "title" | "mapName" | "date" | "startTime" | "endTime" | "notes" | "status" | "expensePercent"
>;

export interface FarmParticipant {
  /** Doküman kimliği = kullanıcı uid'i */
  id: string;
  userId: string;
  displayName: string;
  nickname: string;
  characterClass: string;
  photoURL: string | null;
  sharePercent: number;
  /** Hesaplanan pay tutarı (altın) */
  shareGold: number;
  paymentStatus: PaymentStatus;
  paidAt: Date | null;
  paidBy: string | null;
  note: string;
}

export interface Drop {
  id: string;
  farmId: string;
  farmTitle: string;
  itemName: string;
  category: string;
  quantity: number;
  /** Birim tahmini değer */
  estimatedValue: number;
  /** Birim satış fiyatı - satılmadıysa null */
  soldPrice: number | null;
  sellerId: string | null;
  sellerName: string;
  saleDate: Date | null;
  screenshotUrl: string | null;
  status: DropStatus;
  addedBy: string;
  addedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DropInput = Pick<
  Drop,
  | "farmId"
  | "farmTitle"
  | "itemName"
  | "category"
  | "quantity"
  | "estimatedValue"
  | "soldPrice"
  | "sellerId"
  | "sellerName"
  | "saleDate"
  | "screenshotUrl"
>;

export interface Payment {
  id: string;
  farmId: string;
  farmTitle: string;
  userId: string;
  userName: string;
  amount: number;
  status: PaymentStatus;
  note: string;
  markedBy: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tüm üyelerin okuyabildiği klan ayarları.
 * Discord webhook adresi gizli olduğu için burada değil, yalnızca yöneticilerin
 * erişebildiği `settings/secrets` dokümanında tutulur.
 */
export interface AppSettings {
  clanName: string;
  discordEnabled: boolean;
  /** Yeni farmlarda önerilen ortak kasa kesintisi */
  defaultExpensePercent: number;
  maps: string[];
  itemCategories: string[];
  servers: string[];
  characterClasses: string[];
  updatedAt: Date;
  updatedBy: string | null;
}

/** Dashboard ve raporlarda kullanılan türetilmiş modeller */
export interface PlayerEarning {
  userId: string;
  name: string;
  photoURL: string | null;
  totalGold: number;
  paidGold: number;
  pendingGold: number;
  farmCount: number;
}

export interface MonthlyEarning {
  /** "2026-08" */
  key: string;
  label: string;
  gross: number;
  net: number;
  farmCount: number;
}
