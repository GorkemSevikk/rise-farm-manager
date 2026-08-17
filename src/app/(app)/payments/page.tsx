"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Receipt, Search, Wallet } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { usePaymentHistory, useUsers } from "@/hooks/use-data";
import { formatDateTime, formatGold, initialsOf, monthKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { PaymentStatusBadge } from "@/components/common/status-badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Payment } from "@/types";

const ALL = "all";

/**
 * Kaydın tarihi: ödenmiş kayıtlarda ödeme anı, bekleyenlerde kaydın
 * oluşturulma anı.
 */
function paymentDate(payment: Payment): Date {
  return payment.paidAt ?? payment.createdAt;
}

export default function PaymentsPage() {
  const { isAdmin } = useAuth();
  const { data: payments, loading, error } = usePaymentHistory();
  const { data: users } = useUsers();

  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [month, setMonth] = useState(ALL);

  const months = useMemo(() => {
    const map = new Map<string, string>();
    payments.forEach((payment) => {
      const date = paymentDate(payment);
      map.set(
        monthKey(date),
        new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(date)
      );
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [payments]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");

    return payments.filter((payment) => {
      if (userId !== ALL && payment.userId !== userId) return false;
      if (status !== ALL && payment.status !== status) return false;
      if (month !== ALL && monthKey(paymentDate(payment)) !== month) return false;
      if (term) {
        const haystack = `${payment.userName} ${payment.farmTitle} ${payment.note}`.toLocaleLowerCase(
          "tr-TR"
        );
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [payments, search, userId, status, month]);

  const totals = useMemo(() => {
    const paid = filtered
      .filter((payment) => payment.status === "paid")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const pending = filtered
      .filter((payment) => payment.status === "pending")
      .reduce((sum, payment) => sum + payment.amount, 0);
    return { paid, pending };
  }, [filtered]);

  const userById = useMemo(
    () => new Map(users.map((user) => [user.uid, user])),
    [users]
  );

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title="Ödemeler"
        description={
          isAdmin
            ? "Klanda yapılan tüm ödemelerin kaydı: kime, hangi farm için, ne zaman."
            : "Sana yapılan ödemelerin kaydı."
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Ödenen"
          value={formatGold(totals.paid)}
          hint="Listelenen kayıtların toplamı"
          icon={Wallet}
          tone="green"
        />
        <StatCard
          label="Bekleyen"
          value={formatGold(totals.pending)}
          hint="Geri alınmış veya henüz ödenmemiş"
          icon={Clock}
          tone="violet"
        />
        <StatCard
          label="Kayıt sayısı"
          value={`${filtered.length}`}
          hint={
            filtered.length === payments.length
              ? "Tümü listeleniyor"
              : `${payments.length} kaydın içinden`
          }
          icon={Receipt}
          tone="cyan"
        />
      </div>

      <Card className="mb-4">
        <CardContent
          className={cn(
            "grid gap-3 sm:grid-cols-2",
            isAdmin ? "xl:grid-cols-4" : "xl:grid-cols-3"
          )}
        >
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Oyuncu, farm veya not ara"
              className="pl-9"
            />
          </div>

          {isAdmin && (
            <Select value={userId} onValueChange={setUserId}>
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

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm durumlar</SelectItem>
              <SelectItem value="paid">Ödendi</SelectItem>
              <SelectItem value="pending">Bekliyor</SelectItem>
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Dönem" />
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
        </CardContent>
      </Card>

      {error && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Ödemeler yüklenemedi: {error}
        </p>
      )}

      {loading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Ödeme kaydı bulunamadı"
          description={
            payments.length === 0
              ? isAdmin
                ? "Bir farmın pay dağıtımından ödeme işaretlediğinde kayıtlar burada birikir."
                : "Sana yapılan bir ödeme henüz işaretlenmemiş."
              : "Filtrelere uyan kayıt yok."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {isAdmin && <TableHead>Oyuncu</TableHead>}
                <TableHead>Farm</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="hidden sm:table-cell">Tarih</TableHead>
                {isAdmin && <TableHead className="hidden lg:table-cell">İşaretleyen</TableHead>}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((payment) => {
                const player = userById.get(payment.userId);
                const marker = payment.markedBy ? userById.get(payment.markedBy) : undefined;

                return (
                  <TableRow key={payment.id}>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Avatar className="size-7">
                            <AvatarImage src={player?.photoURL ?? undefined} />
                            <AvatarFallback className="text-[10px]">
                              {initialsOf(payment.userName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-sm">{payment.userName}</span>
                        </div>
                      </TableCell>
                    )}

                    <TableCell>
                      <p className="text-sm font-medium">{payment.farmTitle}</p>
                      {payment.note && (
                        <p className="text-xs text-muted-foreground">{payment.note}</p>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-mono text-sm text-primary">
                      {formatGold(payment.amount)}
                    </TableCell>

                    <TableCell>
                      <PaymentStatusBadge status={payment.status} />
                    </TableCell>

                    <TableCell className="hidden text-sm whitespace-nowrap text-muted-foreground sm:table-cell">
                      {formatDateTime(paymentDate(payment))}
                    </TableCell>

                    {isAdmin && (
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                        {marker?.nickname || marker?.displayName || "-"}
                      </TableCell>
                    )}

                    <TableCell>
                      <Button asChild variant="ghost" size="icon-sm">
                        <Link href={`/farms/${payment.farmId}`} aria-label="Farmı aç">
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </TableCell>
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
