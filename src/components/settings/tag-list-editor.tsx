"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TagListEditorProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

/** Ayarlar sayfasındaki serbest liste alanları (harita, kategori, sunucu) */
export function TagListEditor({ label, values, onChange, placeholder }: TagListEditorProps) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value) return;
    if (values.some((item) => item.toLocaleLowerCase("tr-TR") === value.toLocaleLowerCase("tr-TR"))) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" onClick={add} aria-label="Ekle">
          <Plus className="size-4" />
        </Button>
      </div>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {values.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1 pr-1">
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((item) => item !== value))}
                className="rounded-sm p-0.5 transition-colors hover:bg-foreground/10"
                aria-label={`${value} kaldır`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
