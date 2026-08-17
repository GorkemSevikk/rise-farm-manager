"use client";

import { useMemo, useState } from "react";
import { Loader2, Search, Shield, ShieldOff, UserCheck, UserX, Users } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useFarms, useUsers } from "@/hooks/use-data";
import { setUserActive, setUserRole } from "@/services/users";
import { buildPlayerEarningsFromFarms } from "@/lib/profit";
import { formatGold, formatShortDate, initialsOf } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export default function UsersPage() {
  const { profile, isAdmin } = useAuth();
  const { data: users, loading, error } = useUsers();
  const { data: farms } = useFarms();

  const [search, setSearch] = useState("");
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const earnings = useMemo(() => {
    const map = new Map(
      buildPlayerEarningsFromFarms(farms).map((player) => [player.userId, player])
    );
    return map;
  }, [farms]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    if (!term) return users;

    return users.filter((user) =>
      `${user.displayName} ${user.nickname} ${user.email} ${user.discord}`
        .toLocaleLowerCase("tr-TR")
        .includes(term)
    );
  }, [users, search]);

  async function handleRoleChange(uid: string, makeAdmin: boolean) {
    setBusyUid(uid);
    try {
      await setUserRole(uid, makeAdmin ? "admin" : "member");
      toast.success(makeAdmin ? "Yönetici yetkisi verildi." : "Yönetici yetkisi kaldırıldı.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? `İşlem başarısız: ${cause.message}` : "İşlem başarısız."
      );
    } finally {
      setBusyUid(null);
    }
  }

  async function handleActiveChange(uid: string, active: boolean) {
    setBusyUid(uid);
    try {
      await setUserActive(uid, active);
      toast.success(active ? "Üye aktifleştirildi." : "Üye pasife alındı.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? `İşlem başarısız: ${cause.message}` : "İşlem başarısız."
      );
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Üyeler"
        description="Klan üyeleri, karakter bilgileri ve toplam kazançları."
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Oyuncu, e-posta veya Discord ara"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              {users.length} üye
            </span>
            <span>{users.filter((user) => user.role === "admin").length} yönetici</span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Üyeler yüklenemedi: {error}
        </p>
      )}

      {loading ? (
        <Skeleton className="h-80 rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Üye bulunamadı" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Oyuncu</TableHead>
                <TableHead className="hidden md:table-cell">Sınıf / Sunucu</TableHead>
                <TableHead className="hidden lg:table-cell">Discord</TableHead>
                <TableHead className="hidden sm:table-cell">Katılım</TableHead>
                <TableHead className="text-right">Toplam kazanç</TableHead>
                <TableHead>Rol</TableHead>
                {isAdmin && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => {
                const label = user.nickname || user.displayName;
                const earning = earnings.get(user.uid);
                const isMe = user.uid === profile?.uid;

                return (
                  <TableRow key={user.uid} className={cn(isMe && "bg-primary/5")}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8">
                          <AvatarImage src={user.photoURL ?? undefined} alt={label} />
                          <AvatarFallback className="text-[11px]">
                            {initialsOf(label)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {label}
                            {isMe && <span className="ml-1.5 text-xs text-primary">(sen)</span>}
                            {!user.active && (
                              <Badge variant="outline" className="ml-2 text-[10px]">
                                Pasif
                              </Badge>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {user.characterClass || "-"}
                      {user.server && ` · ${user.server}`}
                    </TableCell>

                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {user.discord || "-"}
                    </TableCell>

                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {formatShortDate(user.joinedAt)}
                    </TableCell>

                    <TableCell className="text-right">
                      <p className="font-mono text-sm text-primary">
                        {formatGold(earning?.totalGold ?? 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {earning?.farmCount ?? 0} farm
                      </p>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "border-transparent",
                          user.role === "admin"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </TableCell>

                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={busyUid === user.uid || isMe}
                            onClick={() => handleRoleChange(user.uid, user.role !== "admin")}
                            title={
                              user.role === "admin"
                                ? "Yönetici yetkisini kaldır"
                                : "Yönetici yap"
                            }
                            aria-label="Rolü değiştir"
                          >
                            {busyUid === user.uid ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : user.role === "admin" ? (
                              <ShieldOff className="size-4" />
                            ) : (
                              <Shield className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={busyUid === user.uid || isMe}
                            onClick={() => handleActiveChange(user.uid, !user.active)}
                            title={user.active ? "Pasife al" : "Aktifleştir"}
                            aria-label="Aktiflik durumu"
                          >
                            {user.active ? (
                              <UserX className="size-4 text-destructive" />
                            ) : (
                              <UserCheck className="size-4 text-[var(--success)]" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
