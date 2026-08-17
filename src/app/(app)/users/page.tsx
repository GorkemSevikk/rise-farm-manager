"use client";

import { useMemo, useState } from "react";
import { Loader2, Search, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useFarms, useUsers } from "@/hooks/use-data";
import { setUserActive, setUserApproved, setUserRole } from "@/services/users";
import { buildPlayerEarningsFromFarms } from "@/lib/profit";
import { formatGold, formatShortDate, initialsOf } from "@/lib/format";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AppUser, UserRole } from "@/types";

const ROLE_ORDER: UserRole[] = ["admin", "moderator", "member"];

export default function UsersPage() {
  const { profile, isAdmin } = useAuth();
  const { data: users, loading, error } = useUsers();
  const { data: farms } = useFarms();

  const [search, setSearch] = useState("");
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const earnings = useMemo(
    () =>
      new Map(buildPlayerEarningsFromFarms(farms).map((player) => [player.userId, player])),
    [farms]
  );

  // Onay bekleyenler ayrı bir kuyrukta durur; reddedilen başvurular pasife
  // alındığı için kuyruktan düşüp ana listede "Pasif" olarak görünür.
  const pending = useMemo(
    () => users.filter((user) => !user.approved && user.active),
    [users]
  );

  const roster = useMemo(
    () => users.filter((user) => user.approved || !user.active),
    [users]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    if (!term) return roster;

    return roster.filter((user) =>
      `${user.displayName} ${user.nickname} ${user.email} ${user.discord}`
        .toLocaleLowerCase("tr-TR")
        .includes(term)
    );
  }, [roster, search]);

  async function run(uid: string, action: () => Promise<void>, success: string) {
    setBusyUid(uid);
    try {
      await action();
      toast.success(success);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? `İşlem başarısız: ${cause.message}` : "İşlem başarısız."
      );
    } finally {
      setBusyUid(null);
    }
  }

  // Menüde gizli olsa da adres çubuğundan girilebilir; sayfa yalnızca yöneticiye açık.
  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <EmptyState
          icon={Users}
          title="Bu sayfa yöneticilere açık"
          description="Üye yönetimi ve yetkilendirme yalnızca klan yöneticisi tarafından yapılır."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Üyeler"
        description="Klana katılım başvuruları, yetkiler ve toplam kazançlar."
      />

      {isAdmin && pending.length > 0 && (
        <Card className="mb-4 border-[var(--warning)]/40 bg-[var(--warning)]/5">
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-[var(--warning)]" />
              <p className="font-heading text-sm font-medium">
                {pending.length} kişi onay bekliyor
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Onaylanana kadar bu kişiler hiçbir veriyi göremez. Onaylarsan üye olarak başlar;
              yetkisini aşağıdaki listeden yükseltebilirsin.
            </p>

            <div className="space-y-2">
              {pending.map((user) => (
                <div
                  key={user.uid}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2"
                >
                  <PlayerCell user={user} />
                  <span className="text-xs text-muted-foreground">
                    {formatShortDate(user.joinedAt)}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={busyUid === user.uid}
                      onClick={() =>
                        void run(
                          user.uid,
                          () => setUserApproved(user.uid, true),
                          `${user.nickname || user.displayName} klana kabul edildi.`
                        )
                      }
                    >
                      {busyUid === user.uid ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="size-3.5" />
                      )}
                      Onayla
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyUid === user.uid}
                      onClick={() =>
                        void run(
                          user.uid,
                          () => setUserActive(user.uid, false),
                          "Başvuru reddedildi."
                        )
                      }
                    >
                      <UserX className="size-3.5" />
                      Reddet
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              {roster.length} üye
            </span>
            <span>{users.filter((user) => user.role === "admin").length} yönetici</span>
            <span>{users.filter((user) => user.role === "moderator").length} yardımcı</span>
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
                <TableHead className={cn(isAdmin && "w-40")}>Yetki</TableHead>
                {isAdmin && <TableHead className="w-14" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => {
                const earning = earnings.get(user.uid);
                const isMe = user.uid === profile?.uid;

                return (
                  <TableRow key={user.uid} className={cn(isMe && "bg-primary/5")}>
                    <TableCell>
                      <PlayerCell user={user} isMe={isMe} />
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
                      {isAdmin ? (
                        <Select
                          value={user.role}
                          disabled={busyUid === user.uid || isMe}
                          onValueChange={(value) =>
                            void run(
                              user.uid,
                              () => setUserRole(user.uid, value as UserRole),
                              `Yetki ${ROLE_LABELS[value as UserRole]} olarak güncellendi.`
                            )
                          }
                        >
                          <SelectTrigger className="w-full" aria-label="Yetki seç">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_ORDER.map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "border-transparent",
                            user.role === "member"
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/15 text-primary"
                          )}
                        >
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      )}
                    </TableCell>

                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={busyUid === user.uid || isMe}
                          onClick={() =>
                            void run(
                              user.uid,
                              async () => {
                                await setUserActive(user.uid, !user.active);
                                // Reddedilmiş bir başvuru tekrar aktifleştirilirse
                                // onay kuyruğuna geri döner.
                              },
                              user.active ? "Üye pasife alındı." : "Üye aktifleştirildi."
                            )
                          }
                          title={user.active ? "Erişimi kapat" : "Erişimi aç"}
                          aria-label="Erişim durumu"
                        >
                          {busyUid === user.uid ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : user.active ? (
                            <UserX className="size-4 text-destructive" />
                          ) : (
                            <UserCheck className="size-4 text-[var(--success)]" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-4 space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-4">
        <p className="font-heading text-sm font-medium">Yetkiler ne anlama geliyor?</p>
        {ROLE_ORDER.map((role) => (
          <p key={role} className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{ROLE_LABELS[role]}:</span>{" "}
            {ROLE_DESCRIPTIONS[role]}
          </p>
        ))}
      </div>
    </div>
  );
}

function PlayerCell({ user, isMe = false }: { user: AppUser; isMe?: boolean }) {
  const label = user.nickname || user.displayName;

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar className="size-8">
        <AvatarImage src={user.photoURL ?? undefined} alt={label} />
        <AvatarFallback className="text-[11px]">{initialsOf(label)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {label}
          {isMe && <span className="ml-1.5 text-xs text-primary">(sen)</span>}
          {!user.active && (
            <Badge variant="outline" className="ml-2 text-[10px]">
              Erişim kapalı
            </Badge>
          )}
          {user.active && !user.approved && (
            <Badge variant="outline" className="ml-2 text-[10px]">
              Onay bekliyor
            </Badge>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}
