"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Coins,
  Crown,
  Package,
  Swords,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useDrops, useFarms } from "@/hooks/use-data";
import { buildMonthlyEarnings, buildPlayerEarningsFromFarms, dropTotal } from "@/lib/profit";
import { formatGold, formatShortDate, initialsOf } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { FarmStatusBadge } from "@/components/common/status-badge";
import { MonthlyEarningsChart, PlayerEarningsChart } from "@/components/charts/earnings-charts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { profile } = useAuth();
  const { data: farms, loading: farmsLoading } = useFarms();
  const { data: drops, loading: dropsLoading } = useDrops();

  const stats = useMemo(() => {
    const totalGross = farms.reduce((sum, farm) => sum + farm.grossGold, 0);
    const totalNet = farms.reduce((sum, farm) => sum + farm.netGold, 0);
    const playerEarnings = buildPlayerEarningsFromFarms(farms);
    const pendingGold = playerEarnings.reduce((sum, player) => sum + player.pendingGold, 0);
    const monthly = buildMonthlyEarnings(farms);
    const topDrops = [...drops].sort((a, b) => dropTotal(b) - dropTotal(a)).slice(0, 5);
    const myEarning = playerEarnings.find((player) => player.userId === profile?.uid) ?? null;

    return {
      totalGross,
      totalNet,
      pendingGold,
      playerEarnings,
      monthly,
      topDrops,
      myEarning,
      bestPlayer: playerEarnings[0] ?? null,
    };
  }, [farms, drops, profile?.uid]);

  const loading = farmsLoading || dropsLoading;
  const recentFarms = farms.slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title={`Hoş geldin, ${profile?.nickname || profile?.displayName?.split(" ")[0] || "oyuncu"}`}
        description="Klanın güncel farm performansı ve altın dağılımı."
        actions={
          <Button asChild>
            <Link href="/farms">
              Farmlara git
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Toplam farm"
              value={`${farms.length}`}
              hint={`${farms.filter((farm) => farm.status === "active").length} tanesi devam ediyor`}
              icon={Swords}
              tone="cyan"
            />
            <StatCard
              label="Toplam drop"
              value={`${drops.length}`}
              hint={`${drops.filter((drop) => drop.status === "sold").length} tanesi satıldı`}
              icon={Package}
              tone="violet"
            />
            <StatCard
              label="Toplam gelir"
              value={formatGold(stats.totalGross)}
              hint={`Net dağıtım: ${formatGold(stats.totalNet)}`}
              icon={Coins}
              tone="gold"
            />
            <StatCard
              label="Bekleyen ödeme"
              value={formatGold(stats.pendingGold)}
              hint="Henüz oyunculara ödenmedi"
              icon={Wallet}
              tone="green"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Aylık kazanç</CardTitle>
                <CardDescription>Brüt gelir ve oyunculara dağıtılan net tutar</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.monthly.length === 0 ? (
                  <EmptyState
                    icon={TrendingUp}
                    title="Henüz veri yok"
                    description="İlk farm kaydını oluşturduğunda grafik burada belirecek."
                  />
                ) : (
                  <MonthlyEarningsChart data={stats.monthly} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ayın yıldızı</CardTitle>
                <CardDescription>En çok kazanan oyuncu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.bestPlayer ? (
                  <>
                    <div className="flex items-center gap-3 rounded-xl bg-primary/8 p-3">
                      <Avatar className="size-11 ring-2 ring-primary/40">
                        <AvatarImage src={stats.bestPlayer.photoURL ?? undefined} />
                        <AvatarFallback>{initialsOf(stats.bestPlayer.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-medium">
                          <Crown className="size-4 text-primary" />
                          {stats.bestPlayer.name}
                        </p>
                        <p className="truncate text-sm text-primary">
                          {formatGold(stats.bestPlayer.totalGold)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {stats.playerEarnings.slice(0, 4).map((player, index) => (
                        <div
                          key={player.userId}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="w-4 text-xs text-muted-foreground">{index + 1}.</span>
                            <span className="truncate">{player.name}</span>
                          </span>
                          <span className="shrink-0 font-mono text-xs text-muted-foreground">
                            {formatGold(player.totalGold)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon={Crown}
                    title="Sıralama boş"
                    description="Katılımcı payları hesaplandığında burada görünür."
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Oyuncu bazlı kazanç</CardTitle>
                <CardDescription>Tüm farmların toplamı</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.playerEarnings.length === 0 ? (
                  <EmptyState icon={Coins} title="Henüz kazanç kaydı yok" />
                ) : (
                  <PlayerEarningsChart data={stats.playerEarnings} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>En değerli droplar</CardTitle>
                <CardDescription>Tekil kayıt bazında en yüksek tutarlar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.topDrops.length === 0 ? (
                  <EmptyState icon={Package} title="Henüz drop eklenmedi" />
                ) : (
                  stats.topDrops.map((drop) => (
                    <Link
                      key={drop.id}
                      href={`/farms/${drop.farmId}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{drop.itemName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {drop.farmTitle} · {drop.quantity} adet
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm text-primary">
                        {formatGold(dropTotal(drop))}
                      </span>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Son farmlar</CardTitle>
              <CardDescription>En güncel beş seans</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentFarms.length === 0 ? (
                <EmptyState
                  icon={Swords}
                  title="Henüz farm kaydı yok"
                  description="Yönetici ilk farmı oluşturduğunda burada listelenecek."
                  action={
                    <Button asChild variant="outline" size="sm">
                      <Link href="/farms">Farm sayfasına git</Link>
                    </Button>
                  }
                />
              ) : (
                recentFarms.map((farm) => (
                  <Link
                    key={farm.id}
                    href={`/farms/${farm.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-medium">
                        {farm.title}
                        <FarmStatusBadge status={farm.status} />
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatShortDate(farm.date)} · {farm.mapName || "Harita yok"} ·{" "}
                        {farm.participantCount} oyuncu
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {formatGold(farm.grossGold)}
                      </Badge>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
