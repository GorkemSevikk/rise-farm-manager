"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Loader2, Scale, Save, Trash2, UserPlus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { addParticipant, removeParticipant, updateSharePercents } from "@/services/farms";
import { markAllPaid, setPaymentStatus } from "@/services/payments";
import { equalPercentages, totalPercent } from "@/lib/profit";
import { formatGold, formatPercent, initialsOf } from "@/lib/format";
import { PaymentStatusBadge } from "@/components/common/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AppUser, Farm, FarmParticipant } from "@/types";

interface DistributionPanelProps {
  farm: Farm;
  participants: FarmParticipant[];
  users: AppUser[];
}

export function DistributionPanel({ farm, participants, users }: DistributionPanelProps) {
  // Yardımcı payları düzenleyip katılımcı ekleyebilir; para el değiştirdiğini
  // beyan eden ödeme işaretlemesi ise yalnızca yöneticide kalır.
  const { profile, isAdmin, canManage } = useAuth();
  const [percents, setPercents] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    setPercents(
      Object.fromEntries(participants.map((item) => [item.userId, item.sharePercent]))
    );
  }, [participants]);

  const dirty = useMemo(
    () =>
      participants.some(
        (participant) => (percents[participant.userId] ?? 0) !== participant.sharePercent
      ),
    [participants, percents]
  );

  const sum = totalPercent(
    participants.map((participant) => ({ sharePercent: percents[participant.userId] ?? 0 }))
  );
  const percentValid = participants.length === 0 || Math.abs(sum - 100) < 0.01;
  const paidCount = participants.filter((item) => item.paymentStatus === "paid").length;

  async function handleSavePercents() {
    setSaving(true);
    try {
      await updateSharePercents(farm.id, percents);
      toast.success("Pay yüzdeleri güncellendi.");
    } catch (cause) {
      toast.error(cause instanceof Error ? `Kaydedilemedi: ${cause.message}` : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  function handleDistributeEqually() {
    const values = equalPercentages(participants.length);
    setPercents(
      Object.fromEntries(
        participants.map((participant, index) => [participant.userId, values[index] ?? 0])
      )
    );
  }

  async function handleTogglePayment(participant: FarmParticipant) {
    if (!profile) return;

    setBusyUserId(participant.userId);
    try {
      await setPaymentStatus({
        farm,
        participant,
        status: participant.paymentStatus === "paid" ? "pending" : "paid",
        actor: profile,
      });
      toast.success(
        participant.paymentStatus === "paid"
          ? "Ödeme beklemeye alındı."
          : "Ödeme yapıldı olarak işaretlendi."
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? `İşlem başarısız: ${cause.message}` : "İşlem başarısız."
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleMarkAllPaid() {
    if (!profile) return;

    setSaving(true);
    try {
      await markAllPaid(farm, participants, profile);
      toast.success("Tüm ödemeler tamamlandı olarak işaretlendi.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? `İşlem başarısız: ${cause.message}` : "İşlem başarısız."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(participant: FarmParticipant) {
    setBusyUserId(participant.userId);
    try {
      await removeParticipant(farm.id, participant.userId);
      toast.success("Katılımcı çıkarıldı.");
    } catch (cause) {
      toast.error(cause instanceof Error ? `Çıkarılamadı: ${cause.message}` : "Çıkarılamadı.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge
            variant="secondary"
            className={cn(
              "border-transparent font-mono",
              percentValid
                ? "bg-[var(--success)]/15 text-[var(--success)]"
                : "bg-destructive/15 text-destructive"
            )}
          >
            Toplam {formatPercent(sum)}
          </Badge>
          <span className="text-muted-foreground">
            {paidCount}/{participants.length} ödeme tamamlandı
          </span>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="size-3.5" />
              Katılımcı ekle
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDistributeEqually}
              disabled={participants.length === 0}
            >
              <Scale className="size-3.5" />
              Eşit dağıt
            </Button>
            <Button size="sm" onClick={handleSavePercents} disabled={!dirty || saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Payları kaydet
            </Button>
            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleMarkAllPaid}
                disabled={saving || participants.length === 0 || paidCount === participants.length}
              >
                <BadgeCheck className="size-3.5" />
                Tümünü ödendi yap
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Oyuncu</TableHead>
              <TableHead className="hidden sm:table-cell">Sınıf</TableHead>
              <TableHead className="w-28 text-right">Pay</TableHead>
              <TableHead className="text-right">Tutar</TableHead>
              <TableHead>Ödeme</TableHead>
              {canManage && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((participant) => {
              const label = participant.nickname || participant.displayName;
              const isMe = participant.userId === profile?.uid;

              return (
                <TableRow key={participant.userId} className={cn(isMe && "bg-primary/5")}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8">
                        <AvatarImage src={participant.photoURL ?? undefined} alt={label} />
                        <AvatarFallback className="text-[11px]">
                          {initialsOf(label)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {label}
                          {isMe && <span className="ml-1.5 text-xs text-primary">(sen)</span>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground sm:hidden">
                          {participant.characterClass || "-"}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {participant.characterClass || "-"}
                  </TableCell>

                  <TableCell className="text-right">
                    {canManage ? (
                      <div className="relative ml-auto w-24">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={percents[participant.userId] ?? 0}
                          onChange={(event) =>
                            setPercents((current) => ({
                              ...current,
                              [participant.userId]: Number(event.target.value) || 0,
                            }))
                          }
                          className="h-8 pr-6 text-right font-mono"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                          %
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-sm">
                        {formatPercent(participant.sharePercent)}
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-right font-mono text-sm text-primary">
                    {formatGold(participant.shareGold)}
                  </TableCell>

                  <TableCell>
                    <PaymentStatusBadge status={participant.paymentStatus} />
                  </TableCell>

                  {canManage && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleTogglePayment(participant)}
                            disabled={busyUserId === participant.userId}
                            aria-label="Ödeme durumunu değiştir"
                            title={
                              participant.paymentStatus === "paid"
                                ? "Beklemeye al"
                                : "Ödendi olarak işaretle"
                            }
                          >
                            {busyUserId === participant.userId ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Wallet className="size-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemove(participant)}
                          disabled={busyUserId === participant.userId}
                          aria-label="Katılımcıyı çıkar"
                        >
                          <Trash2 className="size-4 text-destructive" />
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

      {!percentValid && canManage && (
        <p className="text-xs text-destructive">
          Pay yüzdelerinin toplamı %100 değil. Kaydetsen bile dağıtım oransal yapılır; net sonuç
          için toplamı %100&apos;e tamamla.
        </p>
      )}

      <AddParticipantDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        farm={farm}
        users={users.filter(
          (user) =>
            user.approved &&
            user.active &&
            !participants.some((item) => item.userId === user.uid)
        )}
      />
    </div>
  );
}

function AddParticipantDialog({
  open,
  onOpenChange,
  farm,
  users,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farm: Farm;
  users: AppUser[];
}) {
  const [userId, setUserId] = useState("");
  const [percent, setPercent] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setUserId("");
      setPercent(0);
    }
  }, [open]);

  async function handleAdd() {
    const user = users.find((item) => item.uid === userId);
    if (!user) {
      toast.error("Oyuncu seç.");
      return;
    }

    setSaving(true);
    try {
      await addParticipant(farm.id, user, percent);
      toast.success("Katılımcı eklendi.");
      onOpenChange(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? `Eklenemedi: ${cause.message}` : "Eklenemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Katılımcı ekle</DialogTitle>
          <DialogDescription>
            Partiye sonradan katılan oyuncuyu ekle ve pay yüzdesini belirle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Oyuncu seç" />
            </SelectTrigger>
            <SelectContent>
              {users.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Eklenebilecek oyuncu kalmadı.
                </div>
              )}
              {users.map((user) => (
                <SelectItem key={user.uid} value={user.uid}>
                  {user.nickname || user.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={percent}
              onChange={(event) => setPercent(Number(event.target.value) || 0)}
              className="pr-8 text-right font-mono"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
              %
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Ekledikten sonra &quot;Eşit dağıt&quot; ile tüm payları yeniden dengeleyebilirsin.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={handleAdd} disabled={saving || !userId}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
