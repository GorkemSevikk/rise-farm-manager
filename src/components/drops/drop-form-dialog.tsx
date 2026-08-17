"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-data";
import { createDrop, updateDrop } from "@/services/drops";
import { uploadDropScreenshot } from "@/services/storage";
import { notifyDrop } from "@/services/discord";
import { dropTotal } from "@/lib/profit";
import { formatGold, fromDateInputValue, toDateInputValue } from "@/lib/format";
import { GoldInput } from "@/components/common/gold-input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Drop, Farm } from "@/types";

interface DropFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Farm sabitse (detay sayfası) tek eleman verilir */
  farms: Farm[];
  defaultFarmId?: string;
  drop?: Drop;
}

interface FormState {
  farmId: string;
  itemName: string;
  category: string;
  quantity: number;
  estimatedValue: number;
  soldPrice: number;
  isSold: boolean;
  sellerId: string;
  saleDate: string;
  screenshotUrl: string;
}

const NO_SELLER = "none";

function emptyState(farmId: string, category: string): FormState {
  return {
    farmId,
    itemName: "",
    category,
    quantity: 1,
    estimatedValue: 0,
    soldPrice: 0,
    isSold: false,
    sellerId: NO_SELLER,
    saleDate: toDateInputValue(new Date()),
    screenshotUrl: "",
  };
}

export function DropFormDialog({
  open,
  onOpenChange,
  farms,
  defaultFarmId,
  drop,
}: DropFormDialogProps) {
  const { profile } = useAuth();
  const { data: settings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = settings.itemCategories.length ? settings.itemCategories : ["Diğer"];
  const [form, setForm] = useState<FormState>(emptyState(defaultFarmId ?? "", categories[0]));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Ayarlardan kaldırılmış bir kategoriyle kayıtlı eski droplar da düzenlenebilsin.
  const categoryOptions = useMemo(
    () =>
      form.category && !categories.includes(form.category)
        ? [...categories, form.category]
        : categories,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.itemCategories, form.category]
  );

  const isEdit = Boolean(drop);
  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === form.farmId) ?? null,
    [farms, form.farmId]
  );

  useEffect(() => {
    if (!open) return;

    if (drop) {
      setForm({
        farmId: drop.farmId,
        itemName: drop.itemName,
        category: drop.category,
        quantity: drop.quantity,
        estimatedValue: drop.estimatedValue,
        soldPrice: drop.soldPrice ?? 0,
        isSold: drop.soldPrice !== null,
        sellerId: drop.sellerId ?? NO_SELLER,
        saleDate: toDateInputValue(drop.saleDate ?? new Date()),
        screenshotUrl: drop.screenshotUrl ?? "",
      });
    } else {
      setForm(emptyState(defaultFarmId ?? farms[0]?.id ?? "", categories[0]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, drop, defaultFarmId]);

  const previewTotal = dropTotal({
    quantity: form.quantity,
    estimatedValue: form.estimatedValue,
    soldPrice: form.isSold ? form.soldPrice : null,
  });

  async function handleUpload(file: File) {
    if (!profile || !form.farmId) return;

    setUploading(true);
    try {
      const url = await uploadDropScreenshot(file, form.farmId, profile.uid);
      setForm((current) => ({ ...current, screenshotUrl: url }));
      toast.success("Ekran görüntüsü yüklendi.");
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? `Yükleme başarısız: ${cause.message}`
          : "Ekran görüntüsü yüklenemedi."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!profile) return;

    if (!form.farmId) {
      toast.error("Bir farm seçmelisin.");
      return;
    }

    if (!form.itemName.trim()) {
      toast.error("Item adı zorunlu.");
      return;
    }

    const farm = farms.find((item) => item.id === form.farmId);
    const seller =
      form.sellerId === NO_SELLER
        ? null
        : farm?.shares.find((share) => share.userId === form.sellerId) ?? null;

    setSaving(true);
    try {
      const payload = {
        farmId: form.farmId,
        farmTitle: farm?.title ?? "",
        itemName: form.itemName.trim(),
        category: form.category,
        quantity: Math.max(1, Math.round(form.quantity)),
        estimatedValue: Math.max(0, form.estimatedValue),
        soldPrice: form.isSold ? Math.max(0, form.soldPrice) : null,
        sellerId: seller?.userId ?? null,
        sellerName: seller?.name ?? "",
        saleDate: form.isSold ? fromDateInputValue(form.saleDate) : null,
        screenshotUrl: form.screenshotUrl.trim() || null,
      };

      if (drop) {
        await updateDrop(drop.id, drop.farmId, payload);
        toast.success("Drop güncellendi.");
      } else {
        await createDrop(payload, profile);
        toast.success("Drop eklendi.");

        if (settings.discordEnabled && farm) {
          void notifyDrop({
            farmTitle: farm.title,
            mapName: farm.mapName,
            itemName: payload.itemName,
            quantity: payload.quantity,
            totalValue: previewTotal,
            players: farm.shares.map((share) => share.name),
            addedBy: profile.nickname || profile.displayName,
            screenshotUrl: payload.screenshotUrl,
          });
        }
      }

      onOpenChange(false);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? `Kaydedilemedi: ${cause.message}` : "Drop kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Dropu düzenle" : "Yeni drop ekle"}</DialogTitle>
          <DialogDescription>
            Düşen itemi, adedini ve satış bilgisini gir. Paylar otomatik yeniden hesaplanır.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="drop-farm">Farm</Label>
              <Select
                value={form.farmId}
                onValueChange={(value) => setForm({ ...form, farmId: value })}
                disabled={isEdit || Boolean(defaultFarmId)}
              >
                <SelectTrigger id="drop-farm" className="w-full">
                  <SelectValue placeholder="Farm seç" />
                </SelectTrigger>
                <SelectContent>
                  {farms.map((farm) => (
                    <SelectItem key={farm.id} value={farm.id}>
                      {farm.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="drop-name">Item adı</Label>
              <Input
                id="drop-name"
                value={form.itemName}
                placeholder="Örn. Blue Dragon Scale"
                onChange={(event) => setForm({ ...form, itemName: event.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drop-category">Kategori</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <SelectTrigger id="drop-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="drop-quantity">Adet</Label>
              <Input
                id="drop-quantity"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(event) =>
                  setForm({ ...form, quantity: Number(event.target.value) || 1 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drop-estimated">Tahmini birim değer</Label>
              <GoldInput
                id="drop-estimated"
                value={form.estimatedValue}
                onChange={(value) => setForm({ ...form, estimatedValue: value })}
              />
            </div>
          </div>

          <Tabs
            value={form.isSold ? "sold" : "pending"}
            onValueChange={(value) => setForm({ ...form, isSold: value === "sold" })}
          >
            <TabsList className="w-full">
              <TabsTrigger value="pending" className="flex-1">
                Henüz satılmadı
              </TabsTrigger>
              <TabsTrigger value="sold" className="flex-1">
                Satıldı
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="pt-3">
              <p className="text-xs text-muted-foreground">
                Satış yapılana kadar tahmini değer üzerinden hesaplanır.
              </p>
            </TabsContent>

            <TabsContent value="sold" className="grid gap-4 pt-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="drop-sold">Satış fiyatı (birim)</Label>
                <GoldInput
                  id="drop-sold"
                  value={form.soldPrice}
                  onChange={(value) => setForm({ ...form, soldPrice: value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="drop-sale-date">Satış tarihi</Label>
                <Input
                  id="drop-sale-date"
                  type="date"
                  value={form.saleDate}
                  onChange={(event) => setForm({ ...form, saleDate: event.target.value })}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="drop-seller">Satışı yapan</Label>
                <Select
                  value={form.sellerId}
                  onValueChange={(value) => setForm({ ...form, sellerId: value })}
                >
                  <SelectTrigger id="drop-seller" className="w-full">
                    <SelectValue placeholder="Oyuncu seç" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SELLER}>Belirtilmedi</SelectItem>
                    {selectedFarm?.shares.map((share) => (
                      <SelectItem key={share.userId} value={share.userId}>
                        {share.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="drop-screenshot">Ekran görüntüsü (opsiyonel)</Label>
            <div className="flex gap-2">
              <Input
                id="drop-screenshot"
                value={form.screenshotUrl}
                placeholder="Görsel bağlantısı yapıştır veya dosya yükle"
                onChange={(event) => setForm({ ...form, screenshotUrl: event.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={uploading || !form.farmId}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Görsel yükle"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
              </Button>
              {form.screenshotUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setForm({ ...form, screenshotUrl: "" })}
                  aria-label="Görseli kaldır"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
                event.target.value = "";
              }}
            />

            {form.screenshotUrl ? (
              <div className="relative h-40 overflow-hidden rounded-lg border border-border/60">
                {/* Kullanıcı herhangi bir dış bağlantı yapıştırabildiği için next/image yerine
                    doğrudan img kullanıyoruz; geçersiz adres sessizce boş kalır. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.screenshotUrl}
                  alt="Drop ekran görüntüsü"
                  className="size-full object-contain"
                />
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ImagePlus className="size-3.5" />
                Firebase Storage&apos;a yükleyebilir veya Discord/Imgur bağlantısı
                yapıştırabilirsin.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-primary/8 px-4 py-3">
            <span className="text-sm text-muted-foreground">Bu dropun toplam değeri</span>
            <span className="font-mono text-base text-primary">{formatGold(previewTotal)}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Değişiklikleri kaydet" : "Dropu ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
