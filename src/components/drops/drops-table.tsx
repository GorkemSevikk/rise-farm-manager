"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, ImageIcon, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { deleteDrop } from "@/services/drops";
import { dropTotal } from "@/lib/profit";
import { formatGold, formatShortDate } from "@/lib/format";
import { DropStatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Drop } from "@/types";

interface DropsTableProps {
  drops: Drop[];
  showFarmColumn?: boolean;
  onEdit?: (drop: Drop) => void;
}

export function DropsTable({ drops, showFarmColumn = true, onEdit }: DropsTableProps) {
  const { profile, isAdmin } = useAuth();
  const [pendingDelete, setPendingDelete] = useState<Drop | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!pendingDelete) return;

    setDeleting(true);
    try {
      await deleteDrop(pendingDelete.id, pendingDelete.farmId);
      toast.success("Drop silindi.");
      setPendingDelete(null);
    } catch (cause) {
      toast.error(cause instanceof Error ? `Silinemedi: ${cause.message}` : "Drop silinemedi.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Item</TableHead>
              {showFarmColumn && <TableHead className="hidden md:table-cell">Farm</TableHead>}
              <TableHead className="hidden sm:table-cell">Kategori</TableHead>
              <TableHead className="text-right">Adet</TableHead>
              <TableHead className="text-right">Birim</TableHead>
              <TableHead className="text-right">Toplam</TableHead>
              <TableHead className="hidden lg:table-cell">Satan</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {drops.map((drop) => {
              const canManage = isAdmin || drop.addedBy === profile?.uid;
              const unit = drop.soldPrice ?? drop.estimatedValue;

              return (
                <TableRow key={drop.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{drop.itemName}</span>
                      {drop.screenshotUrl && (
                        <a
                          href={drop.screenshotUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground transition-colors hover:text-primary"
                          aria-label="Ekran görüntüsünü aç"
                        >
                          <ImageIcon className="size-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(drop.createdAt)} · {drop.addedByName}
                    </p>
                  </TableCell>

                  {showFarmColumn && (
                    <TableCell className="hidden md:table-cell">
                      <Link
                        href={`/farms/${drop.farmId}`}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {drop.farmTitle || "Farm"}
                        <ExternalLink className="size-3" />
                      </Link>
                    </TableCell>
                  )}

                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="text-xs font-normal">
                      {drop.category}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right font-mono text-sm">{drop.quantity}</TableCell>

                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {formatGold(unit)}
                  </TableCell>

                  <TableCell className="text-right font-mono text-sm text-primary">
                    {formatGold(dropTotal(drop))}
                  </TableCell>

                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {drop.sellerName || "-"}
                  </TableCell>

                  <TableCell>
                    <DropStatusBadge status={drop.status} />
                  </TableCell>

                  <TableCell>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="İşlemler">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEdit && (
                            <DropdownMenuItem onSelect={() => onEdit(drop)}>
                              <Pencil className="size-4" />
                              Düzenle
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setPendingDelete(drop)}
                          >
                            <Trash2 className="size-4" />
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Drop silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{pendingDelete?.itemName}</span> kaydı
              kalıcı olarak silinecek ve farm toplamları yeniden hesaplanacak.
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
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
