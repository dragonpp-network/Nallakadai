import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays } from "lucide-react";
import { useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDate(s: string) {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/** Date-only picker. Value format: YYYY-MM-DD */
export function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const date = parseDate(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 bg-card font-normal">
          <CalendarDays className="h-4 w-4 opacity-70" />
          {date ? date.toLocaleDateString() : <span className="text-muted-foreground">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          {...(date ? { selected: date, defaultMonth: date } : {})}
          onSelect={(d) => {
            if (d) onChange(fmtDate(d));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Date + time picker. Value format: YYYY-MM-DDTHH:mm (datetime-local shape) */
export function DateTimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [datePart = "", timePart = ""] = value ? value.split("T") : ["", ""];
  const set = (d: string, t: string) => onChange(d ? `${d}T${t || "00:00"}` : "");
  return (
    <div className="flex gap-2">
      <div className="min-w-0 flex-1">
        <DateField value={datePart} onChange={(d) => set(d, timePart)} placeholder="Pick a date" />
      </div>
      <Input
        type="time"
        className="w-32 bg-card"
        value={timePart}
        onChange={(e) => set(datePart || fmtDate(new Date()), e.target.value)}
      />
    </div>
  );
}
