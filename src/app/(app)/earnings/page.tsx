"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Coins, Wallet } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useFarms, useUsers } from "@/hooks/use-data";
import { buildPlayerEarningsFromFarms } from "@/lib/profit";
import { formatGold, formatShortDate, initialsOf, monthKey } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { PaymentStatusBadge } from "@/components/common/status-badge";
import { PlayerEarningsChart } from "@/components/charts/earnings-charts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const ALL = "all";

export default function EarningsPage() {
  const { profile, canManage } = useAuth();
  const { data: farms, loading } = useFarms();
  const { data: users } = useUsers();

  const [playerId, setPlayerId] = useState<string>("me");
  const [month, setMonth] = useState<string>(ALL);

  const months = useMemo(() => {
    const map = new Map<string, string>();
    farms.forEach((farm) => {
      map.set(
        monthKey(farm.date),
        new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(farm.date)
      );
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [farms]);

  const scopedFarms = useMemo(
    () => (month === ALL ? farms : farms.filter((farm) => monthKey(farm.date) === month)),
    [farms, month]
  );

  const leaderboard = useMemo(
    () => buildPlayerEarningsFromFarms(scopedFarms),
    [scopedFarms]
  );

  const selectedUserId = !canManage || playerId === "me" ? profile?.uid ?? "" : playerId;
  const selectedUser = canManage
    ? users.find((user) => user.uid === selectedUserId)
    : profile;
  const selected = leaderboard.find((player) => player.userId === selectedUserId) ?? null;

  const personalRows = useMemo(
    () =>
      scopedFarms
        .map((farm) => {
          const share = farm.shares.find((item) => item.userId === selectedUserId);
          return share ? { farm, share } : null;
        })
        .filter((row): row is NonNullable<typeof row> => row !== null),
    [scopedFarms, selectedUserId]
  );

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Kazançlar"
        description={
          canManage
            ? "Oyuncu bazlı pay dökümü ve ödeme durumu."
            : "Yalnızca senin farm payların. Başka oyuncuların kazancı görünmez."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <Select value={playerId} onValueChange={setPlayerId}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="me">Kendi kazancım</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.uid} value={user.uid}>
                      {user.nickname || user.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tüm zamanlar</SelectItem>
                {months.map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Toplam hak edilen"
              value={formatGold(selected?.totalGold ?? 0)}
              hint={`${selected?.farmCount ?? 0} farm katılımı`}
              icon={Coins}
              tone="gold"
            />
            <StatCard
              label="Ödenen"
              value={formatGold(selected?.paidGold ?? 0)}
              icon={Wallet}
              tone="green"
            />
            <StatCard
              label="Bekleyen"
              value={formatGold(selected?.pendingGold ?? 0)}
              icon={BarChart3}
              tone="violet"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5">
                {selectedUser && (
                  <Avatar className="size-7">
                    <AvatarImage src={selectedUser.photoURL ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {initialsOf(selectedUser.nickname || selectedUser.displayName)}
                    </AvatarFallback>
                  </Avatar>
                )}
                {selectedUser?.nickname || selectedUser?.displayName || "Oyuncu"} farm dökümü
              </CardTitle>
              <CardDescription>Hangi farmdan ne kadar pay hak edildi</CardDescription>
            </CardHeader>
            <CardContent>
              {personalRows.length === 0 ? (
                <EmptyState
                  icon={Coins}
                  title="Kayıt bulunamadı"
                  description="Seçilen dönemde bu oyuncunun katıldığı farm yok."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Farm</TableHead>
                        <TableHead className="hidden sm:table-cell">Tarih</TableHead>
                        <TableHead className="text-right">Pay</TableHead>
                        <TableHead className="text-right">Tutar</TableHead>
                        <TableHead>Ödeme</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {personalRows.map(({ farm, share }) => (
                        <TableRow key={farm.id}>
                          <TableCell>
                            <p className="text-sm font-medium">{farm.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {farm.mapName || "Harita yok"}
                            </p>
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                            {formatShortDate(farm.date)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            %{share.sharePercent}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-primary">
                            {formatGold(share.shareGold)}
                          </TableCell>
                          <TableCell>
                            <PaymentStatusBadge status={share.paymentStatus} />
                          </TableCell>
                          <TableCell>
                            <Button asChild variant="ghost" size="icon-sm">
                              <Link href={`/farms/${farm.id}`} aria-label="Farmı aç">
                                <ArrowRight className="size-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {canManage && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Klan sıralaması</CardTitle>
                <CardDescription>Seçilen dönemin toplam payları</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {leaderboard.length === 0 ? (
                  <EmptyState icon={BarChart3} title="Veri yok" />
                ) : (
                  leaderboard.map((player, index) => (
                    <div
                      key={player.userId}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg px-3 py-2",
                        player.userId === selectedUserId && "bg-primary/8"
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="w-4 text-xs text-muted-foreground">{index + 1}.</span>
                        <Avatar className="size-7">
                          <AvatarImage src={player.photoURL ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {initialsOf(player.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm">{player.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {player.pendingGold > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {formatGold(player.pendingGold)} bekliyor
                          </Badge>
                        )}
                        <span className="font-mono text-sm text-primary">
                          {formatGold(player.totalGold)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kazanç grafiği</CardTitle>
                <CardDescription>Oyuncu bazlı karşılaştırma</CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <EmptyState icon={BarChart3} title="Veri yok" />
                ) : (
                  <PlayerEarningsChart data={leaderboard} />
                )}
              </CardContent>
            </Card>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
