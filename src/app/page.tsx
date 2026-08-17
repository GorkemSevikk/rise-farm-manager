"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Coins,
  FlaskConical,
  Loader2,
  ShieldCheck,
  Sparkles,
  Swords,
  Users,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { APP_NAME } from "@/lib/constants";

const FEATURES = [
  {
    icon: Swords,
    title: "Farm seansları",
    description: "Tarih, harita, saat ve katılımcılarıyla her seansı kayıt altına alın.",
  },
  {
    icon: Coins,
    title: "Drop ve satış takibi",
    description: "Düşen itemleri, tahmini değerleri ve gerçek satış fiyatlarını girin.",
  },
  {
    icon: Users,
    title: "Otomatik pay dağıtımı",
    description: "Net gelir, oyuncu yüzdelerine göre kuruşu kuruşuna bölünür.",
  },
  {
    icon: BarChart3,
    title: "Şeffaf istatistik",
    description: "Kim ne kadar hak etti, kim ödendi; herkes aynı tabloyu görür.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, loading, error, isConfigured, isDemo, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, loading, router]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.6_0.14_84/18%),transparent_55%)]" />

      <div className="relative grid w-full max-w-5xl gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            Rise Online klan yönetim paneli
          </div>

          <div className="space-y-4">
            <h1 className="font-heading text-4xl leading-tight font-semibold sm:text-5xl">
              <span className="gold-gradient">{APP_NAME}</span>
            </h1>
            <p className="max-w-lg text-base text-muted-foreground">
              Farm seanslarınızı, dropları ve altın paylaşımını tek yerden yönetin. Hangi farmda
              ne düştü, kaça satıldı, kim ne kadar hak etti; hepsi anlık olarak tüm klanın
              önünde.
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="panel flex gap-3 p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <feature.icon className="size-4.5" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <Card className="border border-border/70 bg-card/80 p-2 backdrop-blur">
          <CardContent className="space-y-6 py-6">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <ShieldCheck className="size-6" />
              </div>
              <h2 className="font-heading text-xl font-semibold">Klan paneline giriş</h2>
              <p className="text-sm text-muted-foreground">
                Google hesabınla giriş yap. İlk girişte profilin otomatik oluşturulur.
              </p>
            </div>

            {isDemo ? (
              <Alert>
                <FlaskConical className="size-4" />
                <AlertTitle>Demo modu açık</AlertTitle>
                <AlertDescription>
                  Firebase anahtarları girilmediği için örnek verilerle çalışıyorsun. Butona
                  bastığında sahte bir yönetici hesabıyla panele girersin; yaptığın değişiklikler
                  yalnızca bu sekmede yaşar.
                </AlertDescription>
              </Alert>
            ) : (
              !isConfigured && (
                <Alert variant="destructive">
                  <AlertTitle>Firebase yapılandırması eksik</AlertTitle>
                  <AlertDescription>
                    Proje kökünde <code className="font-mono text-xs">.env.local</code> dosyasını
                    oluşturup Firebase anahtarlarını girin. Ayrıntılar README dosyasında.
                  </AlertDescription>
                </Alert>
              )
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Giriş yapılamadı</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              size="lg"
              className="h-11 w-full text-sm font-semibold"
              onClick={signInWithGoogle}
              disabled={loading || (!isConfigured && !isDemo)}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <GoogleIcon className="size-4" />
              )}
              {isDemo ? "Demo hesabıyla gir" : "Google ile giriş yap"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Giriş yaparak klan içi farm kayıtlarının görüntülenmesini kabul edersin.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.44a5.5 5.5 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.58-5.17 3.58-8.86Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.86-3c-1.08.72-2.45 1.16-4.08 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
