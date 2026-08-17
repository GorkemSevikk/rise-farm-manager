"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { formatNumber, parseGoldInput } from "@/lib/format";
import { cn } from "@/lib/utils";

interface GoldInputProps {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Altın tutarı girişi: kullanıcı yazarken binlik ayraçlarını canlı biçimlendirir,
 * dışarıya her zaman düz sayı verir.
 */
export function GoldInput({
  value,
  onChange,
  id,
  placeholder = "0",
  disabled,
  className,
}: GoldInputProps) {
  const [text, setText] = useState(value ? formatNumber(value) : "");

  useEffect(() => {
    const parsed = parseGoldInput(text);
    if (parsed !== value) {
      setText(value ? formatNumber(value) : "");
    }
    // Dışarıdan gelen değer değiştiğinde alanı senkronla; yazarken müdahale etme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("pr-14 font-mono tracking-tight", className)}
        onChange={(event) => {
          const raw = event.target.value;
          // Altın tutarı negatif olamaz; parseGoldInput eksi işaretini kabul
          // ettiği için burada sınırlandırıyoruz.
          const parsed = Math.max(0, parseGoldInput(raw));
          setText(raw.trim() === "" ? "" : formatNumber(parsed));
          onChange(parsed);
        }}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
        Altın
      </span>
    </div>
  );
}
