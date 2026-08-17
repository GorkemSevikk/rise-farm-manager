# Rise Farm Manager

Rise Online farm seanslarını, düşen itemleri, satış gelirlerini ve oyuncu paylarını
tek panelden yöneten klan uygulaması. Amaç şeffaflık: hangi farm yapıldı, ne düştü,
kaça satıldı, kim katıldı ve kim ne kadar hak etti — hepsi anlık olarak herkesin
önünde.

## Özellikler

- **Google ile giriş** — İlk girişte Firestore'da profil otomatik oluşur.
- **Rol yönetimi** — `admin` farm/drop/ödeme yönetir, `member` görüntüler.
- **Farm seansları** — Tarih, harita, saat, katılımcı ve not bilgisiyle kayıt.
- **Parti yönetimi** — Katılımcı ekleme/çıkarma, pay yüzdeleri, tek tuşla eşit dağıtım.
- **Drop takibi** — Item, kategori, adet, tahmini değer, gerçek satış fiyatı, satıcı,
  satış tarihi ve ekran görüntüsü.
- **Otomatik kâr paylaşımı** — Brüt gelir → ortak kasa kesintisi → net dağıtım →
  oyuncu payları. Yuvarlama farkı kaybolmadan dağıtılır.
- **Ödeme takibi** — Her oyuncu için "Bekliyor / Ödendi", ayrı `payments` kayıt geçmişi.
- **Gerçek zamanlı** — Biri drop eklediğinde diğer ekranlar yenilenmeden güncellenir.
- **Grafikler** — Aylık kazanç trendi, oyuncu bazlı kazanç, en değerli droplar.
- **Discord webhook** — Yeni drop eklendiğinde kanala otomatik bildirim (opsiyonel).
- **Koyu oyun teması** — Mobil öncelikli, altın vurgulu arayüz.

## Teknoloji

| Katman | Teknoloji |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Dil | TypeScript |
| Stil | Tailwind CSS 4 |
| Bileşenler | shadcn/ui (Radix tabanlı) |
| Veritabanı | Firebase Firestore |
| Kimlik doğrulama | Firebase Authentication (Google) |
| Dosya depolama | Firebase Storage |
| Grafikler | Recharts |
| Dağıtım | Vercel |

## Proje yapısı

```
src/
├─ app/
│  ├─ page.tsx                 # Giriş ekranı (/)
│  ├─ (app)/                   # Oturum gerektiren sayfalar
│  │  ├─ layout.tsx            # AppShell (yan menü + mobil navigasyon + koruma)
│  │  ├─ dashboard/            # İstatistik paneli
│  │  ├─ farms/                # Farm listesi ve filtreler
│  │  ├─ farms/[id]/           # Farm detayı: droplar, pay dağıtımı, notlar
│  │  ├─ drops/                # Tüm droplar
│  │  ├─ earnings/             # Kişisel ve klan kazançları
│  │  ├─ users/                # Üye yönetimi
│  │  └─ settings/             # Profil + klan ayarları
│  └─ api/discord/route.ts     # Webhook'u sunucudan gönderen uç nokta
├─ components/
│  ├─ ui/                      # shadcn/ui bileşenleri
│  ├─ layout/                  # Kabuk, navigasyon, kullanıcı menüsü
│  ├─ common/                  # PageHeader, StatCard, EmptyState, GoldInput...
│  ├─ farms/                   # Farm formu, katılımcı seçici, dağıtım paneli
│  ├─ drops/                   # Drop formu, drop tablosu
│  ├─ charts/                  # Recharts grafikleri
│  └─ settings/                # Liste düzenleyici
├─ hooks/
│  ├─ use-auth.tsx             # Auth context + Firestore profil dinleyicisi
│  └─ use-data.ts              # Realtime Firestore hook'ları
├─ lib/
│  ├─ firebase/client.ts       # Tarayıcı SDK'sı
│  ├─ firebase/admin.ts        # Sunucu SDK'sı (yalnızca API route)
│  ├─ firebase/converters.ts   # Firestore <-> uygulama tipi dönüşümü
│  ├─ profit.ts                # Kâr ve pay hesaplama (saf fonksiyonlar)
│  ├─ format.ts                # Türkçe tarih/sayı biçimleri
│  └─ constants.ts             # Koleksiyon adları, etiketler, varsayılanlar
├─ services/                   # Firestore okuma/yazma katmanı
└─ types/index.ts              # Ortak veri modelleri
```

## Veritabanı yapısı

```
users/{uid}
  displayName, email, photoURL, nickname, characterClass, server,
  discord, role: "admin"|"member", active, joinedAt, updatedAt

farms/{farmId}
  title, mapName, date, startTime, endTime, notes,
  status: "planned"|"active"|"completed"|"paid",
  createdBy, createdByName, participantIds[], participantCount,
  shares[{ userId, name, photoURL, sharePercent, shareGold, paymentStatus }],
  expensePercent, grossGold, expenseGold, netGold, dropCount,
  createdAt, updatedAt

farms/{farmId}/farmParticipants/{uid}
  userId, displayName, nickname, characterClass, photoURL,
  sharePercent, shareGold, paymentStatus, paidAt, paidBy, note

drops/{dropId}
  farmId, farmTitle, itemName, category, quantity,
  estimatedValue, soldPrice, sellerId, sellerName, saleDate,
  screenshotUrl, addedBy, addedByName, createdAt, updatedAt

payments/{farmId}_{uid}
  farmId, farmTitle, userId, userName, amount,
  status: "pending"|"paid", note, markedBy, paidAt, createdAt, updatedAt

settings/global    → clanName, discordEnabled, defaultExpensePercent, maps[], itemCategories[], servers[]
settings/secrets   → discordWebhookUrl   (yalnızca yöneticiler okuyabilir)
```

`farms.shares` alanı, alt koleksiyondaki katılımcı kayıtlarının denormalize edilmiş
kopyasıdır. İkisi de aynı batch içinde yazıldığı için tutarlıdır; sayesinde panel ve
liste ekranları tek sorguyla çalışır.

### Kâr hesabı nasıl işliyor?

1. Her drop için `toplam = adet × (satış fiyatı ?? tahmini değer)`
2. `brüt gelir = tüm dropların toplamı`
3. `kesinti = brüt × ortak kasa yüzdesi`
4. `net = brüt - kesinti`
5. Net tutar katılımcı yüzdelerine göre bölünür. Yüzde toplamı 100 değilse oransal
   dağıtılır; yuvarlamadan kalan artık altın en yüksek paya sahip oyuncuya eklenir,
   böylece dağıtılan toplam her zaman net gelire eşittir.

Hesaplama `src/lib/profit.ts` içinde saf fonksiyonlardadır. Drop veya katılımcı
değiştiren her işlem `recalculateFarm()` çağırır ve tüm toplamları tek batch ile
yeniden yazar.

---

## 0. Firebase olmadan deneme (demo modu)

Anahtar girmeden arayüzü ve tüm akışları gezmek istersen:

```bash
npm install
npm run dev
```

`.env.local` boşsa geliştirme ortamında **demo modu** otomatik açılır. Giriş
ekranındaki **Demo hesabıyla gir** butonu seni örnek bir yönetici hesabıyla panele
alır; 4 farm, 10 drop ve 6 üyeden oluşan örnek veri hazır gelir. Üst şeritten
yönetici/üye görünümü arasında geçiş yapabilir, verileri sıfırlayabilirsin.

Demo modunda:

- Farm, drop, pay ve ödeme işlemleri gerçek hesaplama fonksiyonlarıyla çalışır.
- Veriler yalnızca bellekte tutulur; sekmeyi yenilediğinde örnek veri baştan üretilir.
- Ekran görüntüsü yüklemesi Storage'a gitmez, tarayıcıda gösterilir.
- Discord'a gerçek istek gönderilmez.

Demo modunu elle açıp kapatmak için `.env.local` içine `NEXT_PUBLIC_DEMO_MODE=true`
veya `false` yazabilirsin. Firebase anahtarlarını girdiğinde mod kendiliğinden
kapanır ve uygulama gerçek veritabanına bağlanır.

---

## 1. Firebase bağlantısı

1. [Firebase Console](https://console.firebase.google.com/) → **Proje ekle**.
2. Sol menüde **Build → Authentication → Get started → Google** sağlayıcısını etkinleştir.
   Destek e-postasını seç ve kaydet.
3. **Build → Firestore Database → Create database** → *Production mode* → bölge olarak
   `eur3` veya `europe-west` seç.
4. **Build → Storage → Get started** (drop ekran görüntüleri için). Ücretsiz Spark
   planında Storage kullanılamıyorsa sorun değil: drop formuna Discord/Imgur bağlantısı
   yapıştırabilirsin.
5. **Proje ayarları → Genel → Uygulamalarınız → Web (`</>`)** ile bir web uygulaması ekle.
   Görünen `firebaseConfig` değerlerini bir yere kopyala.
6. **Authentication → Settings → Authorized domains** listesine `localhost` (zaten var)
   ve Vercel alan adını (`proje-adi.vercel.app`) ekle.

### Güvenlik kurallarını yükleme

`firestore.rules` dosyasındaki `isBootstrapAdmin()` fonksiyonunu aç ve
`'ornek@gmail.com'` yerine kendi Google e-postanı yaz (birden fazla olabilir):

```
return isSignedIn()
  && request.auth.token.email in [
    'senin-mailin@gmail.com'
  ];
```

Sonra kuralları yükle. En kolay yol Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # projeni seç
firebase deploy --only firestore:rules,firestore:indexes,storage
```

CLI kullanmak istemezsen `firestore.rules` ve `storage.rules` içeriğini Firebase
Console'daki **Rules** sekmelerine kopyalayıp yapıştırman da yeterli.

> **Not:** Bu listedeki e-posta ilk girişte otomatik `admin` olur. Diğer herkes
> `member` başlar ve panelin **Üyeler** sayfasından yönetici yapılabilir.

## 2. Ortam değişkenleri

`.env.example` dosyasını `.env.local` olarak kopyala ve doldur:

```bash
cp .env.example .env.local     # Windows PowerShell: Copy-Item .env.example .env.local
```

| Değişken | Zorunlu | Açıklama |
| --- | --- | --- |
| `NEXT_PUBLIC_DEMO_MODE` | – | `true` ise Firebase yerine örnek veriler kullanılır |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✔ | Web uygulaması yapılandırmasından |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✔ | `proje-adi.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✔ | Proje kimliği |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✔ | Görsel yükleme için |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✔ | Yapılandırmadan |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✔ | Yapılandırmadan |
| `NEXT_PUBLIC_BOOTSTRAP_ADMIN_EMAILS` | ✔ | İlk yönetici e-postaları (virgülle) |
| `FIREBASE_PROJECT_ID` | Discord için | Hizmet hesabı JSON'undan |
| `FIREBASE_CLIENT_EMAIL` | Discord için | Hizmet hesabı JSON'undan |
| `FIREBASE_PRIVATE_KEY` | Discord için | Hizmet hesabı JSON'undan, çift tırnak içinde |
| `DISCORD_WEBHOOK_URL` | Opsiyonel | Panelden girilmezse yedek olarak kullanılır |

`NEXT_PUBLIC_` ile başlayan değerler tarayıcıya iner; bu normaldir ve Firebase
güvenliği kurallarla sağlanır. Hizmet hesabı anahtarı **asla** `NEXT_PUBLIC_`
olmamalıdır.

## 3. Yerelde çalıştırma

```bash
npm install
npm run dev
```

Tarayıcıdan `http://localhost:3000` adresini aç, **Google ile giriş yap**.

İlk kullanım akışı:

1. Kendi hesabınla gir (bootstrap listesinde olduğun için yönetici olursun).
2. **Ayarlar → Profilim**'den karakter adı, sınıf ve sunucu bilgini gir.
3. **Ayarlar → Klan ayarları**'ndan klan adını ve listeleri (harita, item kategorisi,
   karakter sınıfı, sunucu) düzenle. Listeler formlarda öneri olarak çıkar; harita ve
   sınıf alanlarına listede olmayan bir değer de yazabilirsin.
4. Klan arkadaşların giriş yapsın (böylece `users` koleksiyonuna eklenirler).
5. **Farmlar → Yeni farm** ile seansı oluştur, katılımcıları seç, "Eşit dağıt"a bas.
6. Farm detayında **Drop ekle** ile itemleri gir; satıldıkça satış fiyatını güncelle.
7. **Pay dağıtımı** sekmesinden ödemeleri "Ödendi" olarak işaretle.

Diğer komutlar:

```bash
npm run build     # üretim derlemesi
npm run start     # derlenmiş uygulamayı çalıştır
npm run lint      # ESLint
```

## 4. Vercel'e dağıtım

1. Projeyi bir Git deposuna gönder (GitHub/GitLab).
2. [vercel.com/new](https://vercel.com/new) → depoyu içe aktar. Framework otomatik
   olarak Next.js algılanır, ek ayar gerekmez.
3. **Environment Variables** bölümüne `.env.local` içindeki tüm değişkenleri ekle
   (Production + Preview). `FIREBASE_PRIVATE_KEY` değerini satır sonları `\n` olarak
   kaçışlanmış tek satır halinde yapıştır — kod bunu otomatik çözer.
4. **Deploy**'a bas.
5. Dağıtım bittikten sonra Firebase Console → **Authentication → Settings →
   Authorized domains** listesine Vercel alan adını ekle. Aksi halde Google girişi
   `auth/unauthorized-domain` hatası verir.

## 5. Discord bildirimleri

1. Discord kanalında **Kanal Ayarları → Entegrasyonlar → Webhook oluştur** ile
   webhook adresini kopyala.
2. Panelde **Ayarlar → Klan ayarları → Discord bildirimleri** bölümüne yapıştır,
   anahtarı aç ve kaydet.
3. **Test mesajı gönder** ile doğrula.

Webhook adresi `settings/secrets` dokümanında tutulur ve güvenlik kuralları gereği
yalnızca yöneticiler okuyabilir. Mesaj her zaman `/api/discord` üzerinden, sunucu
tarafından gönderilir; adres hiçbir zaman tarayıcıya inmez. Bu uç nokta Firebase
Admin SDK ile isteği doğruladığı için hizmet hesabı değişkenleri zorunludur.

## Yetki matrisi

| İşlem | Yönetici | Üye |
| --- | --- | --- |
| Farm/drop/kazanç görüntüleme | ✔ | ✔ |
| Kendi profilini düzenleme | ✔ | ✔ |
| Farm oluşturma / düzenleme / silme | ✔ | ✕ |
| Katılımcı ekleme / çıkarma, pay değiştirme | ✔ | ✕ |
| Drop ekleme | ✔ | ✔ |
| Başkasının dropunu düzenleme / silme | ✔ | ✕ |
| Ödeme durumu değiştirme | ✔ | ✕ |
| Rol değiştirme, üyeyi pasife alma | ✔ | ✕ |
| Klan ayarları ve webhook | ✔ | ✕ |

Bu kurallar hem arayüzde hem `firestore.rules` içinde uygulanır; arayüzü atlayıp
doğrudan Firestore'a istek atmak da mümkün değildir.
