"use client";

import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatIsoDateOnly, parseIsoDateOnly } from "@/lib/birth-date";
import { cn } from "@/lib/cn";

function isoToLocalDate(value: string): Date | undefined {
  const parts = parseIsoDateOnly(value);
  return parts ? new Date(parts.year, parts.month - 1, parts.day) : undefined;
}

function localDateToIso(date: Date): string {
  return formatIsoDateOnly({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}

type BirthDatePickerProps = Readonly<{
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
}>;

export function BirthDatePicker({
  id,
  value,
  onChange,
  onBlur,
  invalid = false,
  describedBy,
  disabled = false,
}: BirthDatePickerProps) {
  const selected = isoToLocalDate(value);
  const today = new Date();
  const earliest = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
  const initialMonth = selected ?? new Date(today.getFullYear() - 10, 0, 1);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onBlur={onBlur}
          data-empty={!selected}
          className={cn(
            "h-12 w-full justify-start rounded-xl px-3 text-left font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          <CalendarIcon aria-hidden="true" />
          {selected ? format(selected, "d MMMM yyyy", { locale: pl }) : "Wybierz datę urodzenia"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={initialMonth}
          onSelect={(date) => {
            if (date) {
              onChange(localDateToIso(date));
            }
          }}
          captionLayout="dropdown"
          startMonth={earliest}
          endMonth={today}
          disabled={{ before: earliest, after: today }}
          locale={pl}
          formatters={{
            formatMonthDropdown: (date) => format(date, "LLLL", { locale: pl }),
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
