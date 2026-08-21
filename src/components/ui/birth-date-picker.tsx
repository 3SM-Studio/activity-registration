"use client";

import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

type CalendarPlacement = "top" | "bottom";

const VIEWPORT_PADDING_PX = 12;

export function BirthDatePicker({
  id,
  value,
  onChange,
  onBlur,
  invalid = false,
  describedBy,
  disabled = false,
}: BirthDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<CalendarPlacement>("bottom");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const generatedPanelId = useId();
  const panelId = `${id ?? "birth-date"}-${generatedPanelId}-calendar`;
  const isOpen = open && !disabled;

  const selected = isoToLocalDate(value);
  const today = new Date();
  const earliest = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
  const initialMonth = selected ?? new Date(today.getFullYear() - 10, 0, 1);

  const close = useCallback(
    (restoreFocus = false) => {
      setOpen(false);
      onBlur?.();
      if (restoreFocus) {
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    },
    [onBlur],
  );

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom - VIEWPORT_PADDING_PX;
    const spaceAbove = triggerRect.top - VIEWPORT_PADDING_PX;

    setPlacement(panelRect.height > spaceBelow && spaceAbove > spaceBelow ? "top" : "bottom");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || rootRef.current?.contains(target)) {
        return;
      }
      close();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      close(true);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, isOpen]);

  return (
    <div ref={rootRef} data-slot="birth-date-picker" className="relative w-full">
      <Button
        ref={triggerRef}
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        data-empty={!selected}
        className={cn(
          "h-12 w-full justify-start rounded-xl px-3 text-left font-normal",
          !selected && "text-muted-foreground",
        )}
        onClick={() => {
          if (isOpen) {
            close();
          } else {
            setPlacement("bottom");
            setOpen(true);
          }
        }}
      >
        <CalendarIcon aria-hidden="true" />
        {selected ? format(selected, "d MMMM yyyy", { locale: pl }) : "Wybierz datę urodzenia"}
      </Button>

      {isOpen ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Wybierz datę urodzenia"
          data-slot="birth-date-calendar"
          data-placement={placement}
          className={cn(
            "absolute left-0 z-50 w-auto overflow-hidden rounded-md border bg-popover p-0 text-popover-foreground shadow-md",
            placement === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
          )}
          style={{
            maxWidth: `calc(100vw - ${VIEWPORT_PADDING_PX * 2}px)`,
          }}
        >
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={initialMonth}
            onSelect={(date) => {
              if (!date) {
                return;
              }
              onChange(localDateToIso(date));
              close(true);
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
        </div>
      ) : null}
    </div>
  );
}
