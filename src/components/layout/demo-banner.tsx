"use client";

import { FlaskConical, RotateCcw, Shield, Sparkles, User } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { demoReset } from "@/lib/demo/store";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types";

const DEMO_ROLES: { role: UserRole; label: string; icon: typeof Shield }[] = [
  { role: "admin", label: "Yönetici", icon: Shield },
  { role: "moderator", label: "Yardımcı", icon: Sparkles },
  { role: "member", label: "Üye", icon: User },
];

/**
 * Demo modunda üstte görünen şerit: verinin gerçek olmadığını hatırlatır ve
 * üç rol görünümü arasında geçiş imkanı verir.
 */
export function DemoBanner() {
  const { isDemo, profile, switchDemoRole } = useAuth();

  if (!isDemo) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-primary/20 bg-primary/8 px-4 py-2 text-xs lg:px-6">
      <span className="flex items-center gap-1.5 font-medium text-primary">
        <FlaskConical className="size-3.5" />
        Demo modu
      </span>
      <span className="text-muted-foreground">
        Örnek verilerle çalışıyorsun; değişiklikler sekmeyi yenileyince sıfırlanır.
      </span>

      <div className="ms-auto flex items-center gap-1.5">
        {DEMO_ROLES.map(({ role, label, icon: Icon }) => (
          <Button
            key={role}
            variant={profile?.role === role ? "secondary" : "ghost"}
            size="xs"
            onClick={() => switchDemoRole(role)}
          >
            <Icon className="size-3" />
            {label}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            demoReset();
            toast.success("Demo verileri sıfırlandı.");
          }}
        >
          <RotateCcw className="size-3" />
          Sıfırla
        </Button>
      </div>
    </div>
  );
}
