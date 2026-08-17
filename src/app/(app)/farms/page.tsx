"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Filter, MapPin, Plus, Search, Swords, Users } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useFarms, useUsers } from "@/hooks/use-data";
import { formatGold, formatShortDate, initialsOf } from "@/lib/format";
import { FARM_STATUS_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { FarmStatusBadge, PaymentStatusBadge } from "@/components/common/status-badge";
import { FarmFormDialog } from "@/components/farms/farm-form-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { FarmStatus } from "@/types";

const ALL = "all";

export default function FarmsPage() {
  const { canManage, profile } = useAuth();
  const { data: farms, loading, error } = useFarms();
  const { data: users } = useUsers();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FarmStatus | typeof ALL>(ALL);
  const [player, setPlayer] = useState<string>(ALL);
  const [month, setMonth] = useState<string>(ALL);

  const months = useMemo(() => {
    const set = new Map<string, string>();
    farms.forEach((farm) => {
      const key = `${farm.date.getFullYear()}-${`${farm.date.getMonth() + 1}`.padStart(2, "0")}`;
      set.set(
        key,
        new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(farm.date)
      );
    });
    return [...set.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [farms]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");

    return farms.filter((farm) => {
      if (status !== ALL && farm.status !== status) return false;
      if (player !== ALL && !farm.participantIds.includes(player)) return false;

      if (month !== ALL) {
        const key = `${farm.date.getFullYear()}-${`${farm.date.getMonth() + 1}`.padStart(2, "0")}`;
        if (key !== month) return false;
      }

      if (term) {
        const haystack = `${farm.title} ${farm.mapName} ${farm.createdByName}`.toLocaleLowerCase(
          "tr-TR"
        );
        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [farms, search, status, player, month]);

  const totalGold = filtered.reduce((sum, farm) => sum + farm.grossGold, 0);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title="Farmlar"
        description={
          canManage
            ? "Tüm farm seansları, katılımcıları ve gelirleri."
            : "Katıldığın farmlar ve senin payın. Başka oyuncuların kazancı görünmez."
        }
        actions={
          canManage && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              Yeni farm
            </Button>
          )
        }
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Farm veya harita ara"
              className="pl-9"
            />
          </div>

          <Select value={status} onValueChange={(value) => setStatus(value as FarmStatus | "all")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm durumlar</SelectItem>
              {Object.entries(FARM_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canManage && (
          <Select value={player} onValueChange={setPlayer}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Oyuncu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm oyuncular</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.uid} value={user.uid}>
                  {user.nickname || user.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Ay" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm aylar</SelectItem>
              {months.map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Filter className="size-3.5" />
          {filtered.length} farm listeleniyor
        </span>
        <span className="text-primary">
          {canManage
            ? `Toplam gelir: ${formatGold(totalGold)}`
            : `Senin payın: ${formatGold(
                filtered.reduce((sum, farm) => {
                  const share = farm.shares.find((item) => item.userId === profile?.uid);
                  return sum + (share?.shareGold ?? 0);
                }, 0)
              )}`}
        </span>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Farmlar yüklenemedi: {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Swords}
          title="Farm bulunamadı"
          description={
            farms.length === 0
              ? "Henüz hiç farm kaydı yok. Yönetici yeni bir seans oluşturabilir."
              : "Filtrelere uyan farm yok. Filtreleri temizlemeyi dene."
          }
          action={
            canManage && farms.length === 0 ? (
              <Button onClick={() => setDialogOpen(true)} size="sm">
                <Plus className="size-4" />
                İlk farmı oluştur
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((farm) => (
            <Link key={farm.id} href={`/farms/${farm.id}`} className="group">
              <Card className="h-full transition-colors group-hover:ring-primary/40">
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-heading text-base font-medium">{farm.title}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="size-3.5" />
                        {formatShortDate(farm.date)}
                        {farm.startTime && ` · ${farm.startTime}`}
                        {farm.endTime && ` - ${farm.endTime}`}
                      </p>
                    </div>
                    <FarmStatusBadge status={farm.status} />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {farm.mapName || "Harita belirtilmemiş"}
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
                    {canManage ? (
                      <>
                        <div>
                          <p className="text-[11px] text-muted-foreground uppercase">Brüt gelir</p>
                          <p className="font-mono text-sm text-primary">{formatGold(farm.grossGold)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-muted-foreground uppercase">Drop</p>
                          <p className="font-mono text-sm">{farm.dropCount}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-[11px] text-muted-foreground uppercase">Senin payın</p>
                          <p className="font-mono text-sm text-primary">
                            {formatGold(
                              farm.shares.find((item) => item.userId === profile?.uid)?.shareGold ?? 0
                            )}
                          </p>
                        </div>
                        <PaymentStatusBadge
                          status={
                            farm.shares.find((item) => item.userId === profile?.uid)?.paymentStatus ??
                            "pending"
                          }
                        />
                      </>
                    )}
                  </div>

                  {canManage && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex -space-x-2">
                      {farm.shares.slice(0, 5).map((share) => (
                        <Avatar key={share.userId} className="size-7 ring-2 ring-card">
                          <AvatarImage src={share.photoURL ?? undefined} alt={share.name} />
                          <AvatarFallback className="text-[10px]">
                            {initialsOf(share.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {farm.participantCount > 5 && (
                        <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] ring-2 ring-card">
                          +{farm.participantCount - 5}
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="size-3.5" />
                      {farm.participantCount}
                    </span>
                  </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <FarmFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
