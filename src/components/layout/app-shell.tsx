"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Menu, Shield, Sparkles } from "lucide-react";

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, profile, loading, isAdmin } = useAuth();
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

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
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
            {isAdmin ? <Shield className="size-3.5 text-primary" /> : <Sparkles className="size-3.5" />}
            {isAdmin ? "Yönetici yetkisi aktif" : "Üye görünümü"}
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

        <MobileTabBar pathname={pathname} />
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

function MobileTabBar({ pathname }: { pathname: string }) {
  const items = NAV_ITEMS.filter((item) => item.mobile);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
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
