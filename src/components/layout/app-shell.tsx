"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ban, Clock, Loader2, LogOut, Menu, Shield, Sparkles, UserRound } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-data";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { UserMenu } from "@/components/layout/user-menu";
import { DemoBanner } from "@/components/layout/demo-banner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import type { AppUser } from "@/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, profile, loading, isAdmin, canManage, hasAccess, signOut } = useAuth();
  const { data: settings } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (loading || !isAuthenticated || !profile) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm">Panel yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Onay bekleyen ya da askıya alınmış hesap panele hiç giremez. Asıl engel
  // güvenlik kurallarındadır; buradaki kontrol kullanıcıya sebebini açıklar.
  if (!hasAccess) {
    return <AccessGate profile={profile} onSignOut={signOut} />;
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => (!item.adminOnly || isAdmin) && (!item.manageOnly || canManage)
  );
  const clanName = settings.clanName || APP_NAME;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur lg:flex">
        <BrandHeader clanName={clanName} />
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          {visibleItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="border-t border-border/60 p-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {isAdmin ? (
              <Shield className="size-3.5 text-primary" />
            ) : canManage ? (
              <Sparkles className="size-3.5 text-primary" />
            ) : (
              <UserRound className="size-3.5" />
            )}
            {isAdmin
              ? "Yönetici yetkisi aktif"
              : canManage
                ? "Yardımcı yetkisi aktif"
                : "Üye görünümü"}
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <DemoBanner />
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur lg:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menüyü aç">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0">
              <SheetTitle className="sr-only">Gezinme menüsü</SheetTitle>
              <BrandHeader clanName={clanName} />
              <nav className="space-y-1 px-3 py-4">
                {visibleItems.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate font-heading text-sm font-semibold lg:hidden">
              {clanName}
            </span>
            <Badge variant="outline" className="hidden gap-1 lg:inline-flex">
              <span className="size-1.5 rounded-full bg-[var(--success)]" />
              Canlı senkronizasyon
            </Badge>
          </div>

          <UserMenu />
        </header>

        <main className="flex-1 px-4 pt-5 pb-24 lg:px-6 lg:pb-8">{children}</main>

        <MobileTabBar pathname={pathname} items={visibleItems.filter((item) => item.mobile)} />
      </div>
    </div>
  );
}

/**
 * Onay bekleyen veya askıya alınmış hesaplar için tam ekran bilgi sayfası.
 * Panelin hiçbir bölümü render edilmez.
 */
function AccessGate({
  profile,
  onSignOut,
}: {
  profile: AppUser;
  onSignOut: () => Promise<void>;
}) {
  const waiting = !profile.approved;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-border/60 bg-card p-6 text-center">
        <span
          className={cn(
            "mx-auto flex size-12 items-center justify-center rounded-xl",
            waiting ? "bg-[var(--warning)]/15 text-[var(--warning)]" : "bg-destructive/15 text-destructive"
          )}
        >
          {waiting ? <Clock className="size-6" /> : <Ban className="size-6" />}
        </span>

        <div className="space-y-2">
          <h1 className="font-heading text-lg font-semibold">
            {waiting ? "Onay bekleniyor" : "Erişimin kapatıldı"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {waiting
              ? "Başvurun yöneticiye iletildi. Klana kabul edildiğinde bu sayfa panele dönüşecek; tekrar giriş yapman gerekmez."
              : "Hesabın yönetici tarafından askıya alındı. Bir hata olduğunu düşünüyorsan klan yöneticisiyle görüşebilirsin."}
          </p>
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2 text-left">
          <p className="truncate text-sm font-medium">{profile.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
        </div>

        <Button variant="outline" size="sm" onClick={() => void onSignOut()}>
          <LogOut className="size-4" />
          Çıkış yap
        </Button>
      </div>
    </div>
  );
}

function BrandHeader({ clanName }: { clanName: string }) {
  return (
    <Link
      href="/dashboard"
      className="flex h-14 items-center gap-2.5 border-b border-border/60 px-4"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Sparkles className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-heading text-sm leading-tight font-semibold">
          {clanName}
        </span>
        <span className="block text-[11px] leading-tight text-muted-foreground">
          Rise Farm Manager
        </span>
      </span>
    </Link>
  );
}

function NavLink({
  item,
  pathname,
}: {
  item: (typeof NAV_ITEMS)[number];
  pathname: string;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary/12 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <item.icon className="size-4" />
      {item.label}
    </Link>
  );
}

function MobileTabBar({
  pathname,
  items,
}: {
  pathname: string;
  items: (typeof NAV_ITEMS)[number][];
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur lg:hidden">
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="size-4.5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
