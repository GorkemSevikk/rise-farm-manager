"use client";

import { FlaskConical, RotateCcw, Shield, User } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { demoReset } from "@/lib/demo/store";
import { Button } from "@/components/ui/button";

/**
 * Demo modunda üstte görünen şerit: verinin gerçek olmadığını hatırlatır ve
 * yönetici/üye görünümleri arasında geçiş imkanı verir.
 */
export function DemoBanner() {
  const { isDemo, isAdmin, switchDemoRole } = useAuth();

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
        <Button
          variant={isAdmin ? "secondary" : "ghost"}
          size="xs"
          onClick={() => switchDemoRole("admin")}
        >
          <Shield className="size-3" />
          Yönetici
        </Button>
        <Button
          variant={isAdmin ? "ghost" : "secondary"}
          size="xs"
          onClick={() => switchDemoRole("member")}
        >
          <User className="size-3" />
          Üye
        </Button>
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
