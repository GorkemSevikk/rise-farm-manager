"use client";

import { Scale, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types";

export interface ParticipantSelection {
  userId: string;
  sharePercent: number;
}

interface ParticipantPickerProps {
  users: AppUser[];
  value: ParticipantSelection[];
  onChange: (value: ParticipantSelection[]) => void;
  onDistributeEqually: () => void;
}

export function ParticipantPicker({
  users,
  value,
  onChange,
  onDistributeEqually,
}: ParticipantPickerProps) {
  const total = Math.round(value.reduce((sum, item) => sum + item.sharePercent, 0) * 100) / 100;
  const isValid = value.length === 0 || Math.abs(total - 100) < 0.01;

  function toggle(user: AppUser, checked: boolean) {
    if (checked) {
      onChange([...value, { userId: user.uid, sharePercent: 0 }]);
    } else {
      onChange(value.filter((item) => item.userId !== user.uid));
    }
  }

  function setPercent(userId: string, percent: number) {
    onChange(
      value.map((item) => (item.userId === userId ? { ...item, sharePercent: percent } : item))
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">Seçili oyuncu:</span>
          <Badge variant="outline">{value.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "border-transparent font-mono",
              isValid
                ? "bg-[var(--success)]/15 text-[var(--success)]"
                : "bg-destructive/15 text-destructive"
            )}
          >
            Toplam %{total}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDistributeEqually}
            disabled={value.length === 0}
          >
            <Scale className="size-3.5" />
            Eşit dağıt
          </Button>
        </div>
      </div>

      <ScrollArea className="h-64 rounded-lg border border-border/60">
        <div className="divide-y divide-border/50">
          {users.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Henüz kayıtlı oyuncu yok. Üyeler giriş yaptıkça burada listelenir.
            </p>
          )}

          {users.map((user) => {
            const selection = value.find((item) => item.userId === user.uid);
            const checked = Boolean(selection);
            const label = user.nickname || user.displayName;

            return (
              <label
                key={user.uid}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors",
                  checked ? "bg-primary/6" : "hover:bg-muted/40"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(state) => toggle(user, state === true)}
                />
                <Avatar className="size-8">
                  <AvatarImage src={user.photoURL ?? undefined} alt={label} />
                  <AvatarFallback className="text-[11px]">{initialsOf(label)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.characterClass || "Sınıf belirtilmemiş"}
                  </p>
                </div>
                {checked && (
                  <div className="relative w-24 shrink-0">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      value={selection?.sharePercent ?? 0}
                      onChange={(event) =>
                        setPercent(user.uid, Number(event.target.value) || 0)
                      }
                      onClick={(event) => event.preventDefault()}
                      className="pr-6 text-right font-mono"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                )}
              </label>
            );
          })}
        </div>
      </ScrollArea>

      {!isValid && (
        <p className="text-xs text-destructive">
          Pay yüzdelerinin toplamı %100 olmalı. &quot;Eşit dağıt&quot; ile hızlıca
          düzeltebilirsin.
        </p>
      )}
    </div>
  );
}
