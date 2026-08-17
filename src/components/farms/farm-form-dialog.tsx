"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useSettings, useUsers } from "@/hooks/use-data";
import { createFarm, updateFarm } from "@/services/farms";
import { equalPercentages, totalPercent } from "@/lib/profit";
import { fromDateInputValue, toDateInputValue } from "@/lib/format";
import { FARM_STATUS_LABELS } from "@/lib/constants";
import {
  ParticipantPicker,
  type ParticipantSelection,
} from "@/components/farms/participant-picker";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Farm, FarmStatus } from "@/types";

interface FarmFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Verilirse düzenleme modunda açılır */
  farm?: Farm;
}

interface FormState {
  title: string;
  mapName: string;
  date: string;
  startTime: string;
  endTime: string;
  expensePercent: number;
  status: FarmStatus;
  notes: string;
}

function emptyState(defaultExpense: number): FormState {
  return {
    title: "",
    mapName: "",
    date: toDateInputValue(new Date()),
    startTime: "20:00",
    endTime: "23:00",
    expensePercent: defaultExpense,
    status: "active",
    notes: "",
  };
}

export function FarmFormDialog({ open, onOpenChange, farm }: FarmFormDialogProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: users } = useUsers();
  const { data: settings } = useSettings();

  const [form, setForm] = useState<FormState>(emptyState(0));
  const [participants, setParticipants] = useState<ParticipantSelection[]>([]);
  const [saving, setSaving] = useState(false);

  // Onay bekleyen veya askıya alınmış kişiler farma eklenemez.
  const activeUsers = useMemo(
    () => users.filter((user) => user.approved && user.active),
    [users]
  );
  const isEdit = Boolean(farm);

  // Formun hangi kayıt için doldurulduğunu tutar.
  const initializedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      initializedFor.current = null;
      return;
    }

    // Form yalnızca dialog açıldığında doldurulur. Aksi halde canlı Firestore
    // güncellemeleri (yeni drop eklenmesi, değişen toplamlar) farm nesnesini
    // yenileyip kullanıcının o an yazdıklarını silerdi.
    const key = farm?.id ?? "new";
    if (initializedFor.current === key) return;
    initializedFor.current = key;

    if (farm) {
      setForm({
        title: farm.title,
        mapName: farm.mapName,
        date: toDateInputValue(farm.date),
        startTime: farm.startTime,
        endTime: farm.endTime,
        expensePercent: farm.expensePercent,
        status: farm.status,
        notes: farm.notes,
      });
      setParticipants(
        farm.shares.map((share) => ({
          userId: share.userId,
          sharePercent: share.sharePercent,
        }))
      );
    } else {
      setForm(emptyState(settings.defaultExpensePercent));
      setParticipants([]);
    }
  }, [open, farm, settings.defaultExpensePercent]);

  function distributeEqually() {
    const percents = equalPercentages(participants.length);
    setParticipants(
      participants.map((item, index) => ({ ...item, sharePercent: percents[index] ?? 0 }))
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // `saving` kontrolü çift gönderimi engeller: buton devre dışı kalsa da
    // Enter ile art arda gönderim aynı farmı iki kez oluşturabilir.
    if (!profile || saving) return;

    if (!form.title.trim()) {
      toast.error("Farm adı zorunlu.");
      return;
    }

    if (!isEdit) {
      if (participants.length === 0) {
        toast.error("En az bir katılımcı seçmelisin.");
        return;
      }

      // Paylar %100'e tamamlanmazsa net altın oyunculara eksik ya da fazla
      // dağıtılır. Uyarı zaten gösteriliyordu ama kayda engel değildi.
      const total = totalPercent(participants);
      if (Math.abs(total - 100) >= 0.01) {
        toast.error(`Pay yüzdeleri toplamı %100 olmalı. Şu an %${total}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const input = {
        title: form.title.trim(),
        mapName: form.mapName.trim(),
        date: fromDateInputValue(form.date),
        startTime: form.startTime,
        endTime: form.endTime,
        notes: form.notes.trim(),
        status: form.status,
        expensePercent: Math.min(100, Math.max(0, form.expensePercent)),
      };

      if (farm) {
        await updateFarm(farm.id, input);
        toast.success("Farm güncellendi.");
      } else {
        const selected = participants
          .map((item) => {
            const user = activeUsers.find((candidate) => candidate.uid === item.userId);
            return user ? { user, sharePercent: item.sharePercent } : null;
          })
          .filter((item): item is { user: (typeof activeUsers)[number]; sharePercent: number } =>
            Boolean(item)
          );

        // Seçim yapıldıktan sonra bir oyuncu pasifleştirilmiş olabilir. Sessizce
        // listeden düşürmek yerine uyarıyoruz; aksi halde paylar %100'ün altına
        // iner ve eksik katılımcıyla farm oluşur.
        if (selected.length !== participants.length) {
          toast.error("Seçili oyunculardan biri artık aktif değil. Listeyi güncelle.");
          return;
        }

        const farmId = await createFarm({ input, participants: selected, author: profile });
        toast.success("Farm oluşturuldu.");
        router.push(`/farms/${farmId}`);
      }

      onOpenChange(false);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? `Kaydedilemedi: ${cause.message}` : "Farm kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Farmı düzenle" : "Yeni farm oluştur"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Seans bilgilerini güncelle. Katılımcıları farm detay sayfasından yönetebilirsin."
              : "Seans bilgilerini gir ve partiye katılan oyuncuları paylarıyla birlikte seç."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="farm-title">Farm adı</Label>
              <Input
                id="farm-title"
                value={form.title}
                placeholder="Örn. Topmuş akşam farmı"
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="farm-map">Harita / bölge</Label>
              <Input
                id="farm-map"
                list="farm-map-options"
                value={form.mapName}
                placeholder="Örn. Topmuş"
                onChange={(event) => setForm({ ...form, mapName: event.target.value })}
              />
              <datalist id="farm-map-options">
                {settings.maps.map((map) => (
                  <option key={map} value={map} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="farm-date">Tarih</Label>
              <Input
                id="farm-date"
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="farm-start">Başlangıç saati</Label>
              <Input
                id="farm-start"
                type="time"
                value={form.startTime}
                onChange={(event) => setForm({ ...form, startTime: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="farm-end">Bitiş saati</Label>
              <Input
                id="farm-end"
                type="time"
                value={form.endTime}
                onChange={(event) => setForm({ ...form, endTime: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="farm-expense">Ortak kasa kesintisi (%)</Label>
              <Input
                id="farm-expense"
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={form.expensePercent}
                onChange={(event) =>
                  setForm({ ...form, expensePercent: Number(event.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Pot, tamir gibi giderler için brüt gelirden düşülür.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="farm-status">Durum</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm({ ...form, status: value as FarmStatus })}
              >
                <SelectTrigger id="farm-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FARM_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="farm-notes">Notlar</Label>
              <Textarea
                id="farm-notes"
                rows={3}
                value={form.notes}
                placeholder="Seansla ilgili notlar, boss saatleri, dikkat edilecekler..."
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label>Parti üyeleri ve paylar</Label>
              <ParticipantPicker
                users={activeUsers}
                value={participants}
                onChange={setParticipants}
                onDistributeEqually={distributeEqually}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Değişiklikleri kaydet" : "Farmı oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
