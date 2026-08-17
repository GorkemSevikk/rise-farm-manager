"use client";

import { useMemo, useState } from "react";
import { Coins, Package, Plus, Search, TrendingUp } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useDrops, useFarms, useSettings } from "@/hooks/use-data";
import { useDropAlerts } from "@/hooks/use-drop-alerts";
import { dropTotal } from "@/lib/profit";
import { formatGold } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { DropsTable } from "@/components/drops/drops-table";
import { DropFormDialog } from "@/components/drops/drop-form-dialog";
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
import type { Drop } from "@/types";

const ALL = "all";

export default function DropsPage() {
  const { profile } = useAuth();
  const { data: drops, loading, error } = useDrops();
  const { data: farms } = useFarms();
  const { data: settings } = useSettings();

  useDropAlerts(drops, !loading, profile?.uid);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Drop | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [farmId, setFarmId] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [status, setStatus] = useState(ALL);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr-TR");

    return drops.filter((drop) => {
      if (farmId !== ALL && drop.farmId !== farmId) return false;
      if (category !== ALL && drop.category !== category) return false;
      if (status !== ALL && drop.status !== status) return false;
      if (term) {
        const haystack = `${drop.itemName} ${drop.farmTitle} ${drop.sellerName}`.toLocaleLowerCase(
          "tr-TR"
        );
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [drops, search, farmId, category, status]);

  // Ödemesi kapatılmış farmlara yeni drop eklenemez ve mevcut dropları
  // değiştirilemez; aksi halde paylar değişir ama katılımcılar "ödendi"
  // göründüğü için oluşan fark kimseye yansımaz.
  const lockedFarmIds = useMemo(
    () => new Set(farms.filter((farm) => farm.status === "paid").map((farm) => farm.id)),
    [farms]
  );

  const openFarms = useMemo(() => farms.filter((farm) => farm.status !== "paid"), [farms]);

  const totals = useMemo(() => {
    const total = filtered.reduce((sum, drop) => sum + dropTotal(drop), 0);
    const sold = filtered
      .filter((drop) => drop.status === "sold")
      .reduce((sum, drop) => sum + dropTotal(drop), 0);
    return { total, sold, pending: total - sold };
  }, [filtered]);

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(drop: Drop) {
    setEditing(drop);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title="Droplar"
        description="Tüm farmlardan düşen itemler, satış fiyatları ve toplam değerleri."
        actions={
          <Button
            onClick={openCreate}
            disabled={openFarms.length === 0}
            title={
              openFarms.length === 0 && farms.length > 0
                ? "Drop eklenebilecek açık farm yok; tüm farmların ödemesi tamamlanmış."
                : undefined
            }
          >
            <Plus className="size-4" />
            Drop ekle
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Listelenen değer"
          value={formatGold(totals.total)}
          hint={`${filtered.length} kayıt`}
          icon={Coins}
          tone="gold"
        />
        <StatCard
          label="Satılan"
          value={formatGold(totals.sold)}
          hint="Gerçekleşen satış geliri"
          icon={TrendingUp}
          tone="green"
        />
        <StatCard
          label="Bekleyen"
          value={formatGold(totals.pending)}
          hint="Tahmini değer üzerinden"
          icon={Package}
          tone="violet"
        />
      </div>

      <Card className="mb-4">
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Item ara"
              className="pl-9"
            />
          </div>

          <Select value={farmId} onValueChange={setFarmId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Farm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm farmlar</SelectItem>
              {farms.map((farm) => (
                <SelectItem key={farm.id} value={farm.id}>
                  {farm.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm kategoriler</SelectItem>
              {settings.itemCategories.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm durumlar</SelectItem>
              <SelectItem value="sold">Satıldı</SelectItem>
              <SelectItem value="pending">Satılmadı</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {error && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Droplar yüklenemedi: {error}
        </p>
      )}

      {loading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Drop bulunamadı"
          description={
            drops.length === 0
              ? "Henüz drop eklenmemiş. Bir farm seçip ilk dropu ekleyebilirsin."
              : "Filtrelere uyan drop yok."
          }
          action={
            openFarms.length > 0 ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" />
                Drop ekle
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DropsTable drops={filtered} onEdit={openEdit} lockedFarmIds={lockedFarmIds} />
      )}

      <DropFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        farms={openFarms}
        drop={editing}
      />
    </div>
  );
}
