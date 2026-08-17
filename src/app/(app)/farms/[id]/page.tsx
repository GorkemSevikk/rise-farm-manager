"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Coins,
  MapPin,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Scissors,
  StickyNote,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useFarm, useFarmDrops, useParticipants, useUsers } from "@/hooks/use-data";
import { useDropAlerts } from "@/hooks/use-drop-alerts";
import { deleteFarm } from "@/services/farms";
import { dropTotal } from "@/lib/profit";
import { formatDate, formatGold, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { FarmStatusBadge } from "@/components/common/status-badge";
import { FarmFormDialog } from "@/components/farms/farm-form-dialog";
import { DistributionPanel } from "@/components/farms/distribution-panel";
import { DropFormDialog } from "@/components/drops/drop-form-dialog";
import { DropsTable } from "@/components/drops/drops-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Drop } from "@/types";

export default function FarmDetailPage() {
  const params = useParams<{ id: string }>();
  const farmId = params?.id ?? "";
  const router = useRouter();

  const { profile, isAdmin } = useAuth();
  const { data: farm, loading } = useFarm(farmId);
  const { data: participants } = useParticipants(farmId);
  const { data: drops, loading: dropsLoading } = useFarmDrops(farmId);
  const { data: users } = useUsers();

  useDropAlerts(drops, !dropsLoading, profile?.uid);

  const [editOpen, setEditOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [editingDrop, setEditingDrop] = useState<Drop | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="mx-auto w-full max-w-3xl pt-10">
        <EmptyState
          icon={Package}
          title="Farm bulunamadı"
          description="Bu kayıt silinmiş olabilir ya da erişim yetkin yok."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/farms">
                <ArrowLeft className="size-4" />
                Farmlara dön
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  // Ödemesi kapatılmış bir farma yeni drop eklenirse paylar yeniden hesaplanır
  // ama katılımcılar "ödendi" göründüğü için oluşan fark kimseye yansımaz.
  // Bu yüzden farm ödendi durumundayken drop girişi kapatılır.
  const locked = farm.status === "paid";

  const soldGold = drops
    .filter((drop) => drop.status === "sold")
    .reduce((sum, drop) => sum + dropTotal(drop), 0);
  const pendingPayment = participants
    .filter((participant) => participant.paymentStatus === "pending")
    .reduce((sum, participant) => sum + participant.shareGold, 0);

  async function handleDelete() {
    if (!farm) return;

    setDeleting(true);
    try {
      await deleteFarm(farm.id);
      toast.success("Farm silindi.");
      router.replace("/farms");
    } catch (cause) {
      toast.error(cause instanceof Error ? `Silinemedi: ${cause.message}` : "Farm silinemedi.");
      setDeleting(false);
    }
  }

  function openCreateDrop() {
    setEditingDrop(undefined);
    setDropOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/farms">
          <ArrowLeft className="size-4" />
          Farmlar
        </Link>
      </Button>

      <PageHeader
        title={farm.title}
        description={`${formatDate(farm.date)} · Oluşturan: ${farm.createdByName || "-"}`}
        actions={
          <>
            <Button
              onClick={openCreateDrop}
              disabled={locked}
              title={
                locked
                  ? "Ödemesi tamamlanan farma drop eklenemez. Önce bir ödemeyi geri alın."
                  : undefined
              }
            >
              <Plus className="size-4" />
              Drop ekle
            </Button>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Farm işlemleri">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                    <Pencil className="size-4" />
                    Farmı düzenle
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                    <Trash2 className="size-4" />
                    Farmı sil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <FarmStatusBadge status={farm.status} />
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          {formatDate(farm.date)}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="size-3.5" />
          {farm.mapName || "Harita belirtilmemiş"}
        </span>
        {(farm.startTime || farm.endTime) && (
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {farm.startTime || "?"} - {farm.endTime || "?"}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Users className="size-3.5" />
          {farm.participantCount} oyuncu
        </span>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Brüt gelir"
          value={formatGold(farm.grossGold)}
          hint={`${drops.length} drop`}
          icon={Coins}
          tone="gold"
        />
        <StatCard
          label="Ortak kasa kesintisi"
          value={formatGold(farm.expenseGold)}
          hint={formatPercent(farm.expensePercent)}
          icon={Scissors}
          tone="violet"
        />
        <StatCard
          label="Net dağıtım"
          value={formatGold(farm.netGold)}
          hint="Oyunculara bölünen tutar"
          icon={Users}
          tone="cyan"
        />
        <StatCard
          label="Bekleyen ödeme"
          value={formatGold(pendingPayment)}
          hint={`Satılan: ${formatGold(soldGold)}`}
          icon={Wallet}
          tone="green"
        />
      </div>

      <Tabs defaultValue="drops">
        <TabsList>
          <TabsTrigger value="drops">Droplar ({drops.length})</TabsTrigger>
          <TabsTrigger value="distribution">Pay dağıtımı ({participants.length})</TabsTrigger>
          <TabsTrigger value="notes">Notlar</TabsTrigger>
        </TabsList>

        <TabsContent value="drops" className="space-y-3 pt-4">
          {locked && (
            <p className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Bu farmın ödemeleri tamamlandı, drop listesi kilitli. Değişiklik gerekiyorsa pay
              dağıtımı sekmesinden bir ödemeyi bekleyene çevirin.
            </p>
          )}

          {drops.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Bu farmda henüz drop yok"
              description="Seans sırasında düşen itemleri ekle; toplamlar ve paylar anında güncellenir."
              action={
                <Button size="sm" onClick={openCreateDrop} disabled={locked}>
                  <Plus className="size-4" />
                  İlk dropu ekle
                </Button>
              }
            />
          ) : (
            <DropsTable
              drops={drops}
              showFarmColumn={false}
              lockedFarmIds={locked ? new Set([farm.id]) : undefined}
              onEdit={(drop) => {
                setEditingDrop(drop);
                setDropOpen(true);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="distribution" className="pt-4">
          {participants.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Katılımcı yok"
              description="Yönetici partiye katılan oyuncuları ekleyerek pay dağıtımını başlatabilir."
            />
          ) : (
            <DistributionPanel farm={farm} participants={participants} users={users} />
          )}
        </TabsContent>

        <TabsContent value="notes" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="size-4 text-muted-foreground" />
                Seans notları
              </CardTitle>
              <CardDescription>Yönetici tarafından girilen açıklamalar</CardDescription>
            </CardHeader>
            <CardContent>
              {farm.notes ? (
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{farm.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Not girilmemiş.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FarmFormDialog open={editOpen} onOpenChange={setEditOpen} farm={farm} />
      <DropFormDialog
        open={dropOpen}
        onOpenChange={setDropOpen}
        farms={[farm]}
        defaultFarmId={farm.id}
        drop={editingDrop}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Farm silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{farm.title}</span> farmı, tüm dropları
              ve katılımcı kayıtları kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
            >
              Kalıcı olarak sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
