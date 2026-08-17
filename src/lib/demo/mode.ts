import { isFirebaseConfigured } from "@/lib/firebase/client";

/**
 * Demo modu: Firebase olmadan, bellekteki örnek verilerle çalışır.
 *
 * İki durumda açılır:
 *  - NEXT_PUBLIC_DEMO_MODE=true verildiğinde (bilinçli tercih),
 *  - geliştirme ortamında Firebase anahtarları henüz girilmemişse.
 *
 * Üretimde anahtarlar eksikse demo moda düşülmez; kullanıcıya kurulum uyarısı
 * gösterilir, aksi halde gerçek bir yapılandırma hatası fark edilmeden kalır.
 */
export const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  (!isFirebaseConfigured && process.env.NODE_ENV !== "production");
