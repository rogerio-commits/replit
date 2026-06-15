import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

export function addBusinessDays(fromDate: string, days: number): string {
  if (!fromDate || days <= 0) return "";
  const date = new Date(fromDate + "T12:00:00");
  let count = 0;
  while (count < days) {
    date.setDate(date.getDate() + 1);
    const d = date.getDay();
    if (d !== 0 && d !== 6) count++;
  }
  return date.toISOString().split("T")[0];
}

function countBusinessDays(fromDate: string, toDate: string): number {
  if (!fromDate || !toDate) return 0;
  const from = new Date(fromDate + "T12:00:00");
  const to = new Date(toDate + "T12:00:00");
  if (to <= from) return 0;
  let count = 0;
  const current = new Date(from);
  while (current < to) {
    current.setDate(current.getDate() + 1);
    const d = current.getDay();
    if (d !== 0 && d !== 6) count++;
  }
  return count;
}

function formatRefLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

interface DateWithDaysCalcProps {
  value: string;
  onChange: (value: string) => void;
  referenceDate?: string;
  disabled?: boolean;
}

export function DateWithDaysCalc({ value, onChange, referenceDate, disabled }: DateWithDaysCalcProps) {
  const [days, setDays] = useState<string>("");

  useEffect(() => {
    if (value && referenceDate) {
      const computed = countBusinessDays(referenceDate, value);
      setDays(computed > 0 ? String(computed) : "");
    } else {
      setDays("");
    }
  }, [value, referenceDate]);

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  function handleDaysChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDays(raw);
    const n = parseInt(raw, 10);
    if (n > 0) {
      const from = referenceDate || new Date().toISOString().split("T")[0];
      const calculated = addBusinessDays(from, n);
      if (calculated) onChange(calculated);
    }
  }

  const refLabel = referenceDate ? `desde ${formatRefLabel(referenceDate)}` : "desde hoje";

  return (
    <div className="space-y-1.5">
      <Input type="date" value={value} onChange={handleDateChange} disabled={disabled} />
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min="1"
          max="999"
          placeholder="—"
          value={days}
          onChange={handleDaysChange}
          disabled={disabled}
          className="h-6 w-16 text-xs px-2 py-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          dias úteis {refLabel}
        </span>
      </div>
    </div>
  );
}
