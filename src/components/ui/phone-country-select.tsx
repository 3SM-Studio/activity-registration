"use client";

import type { ElementType, FocusEventHandler } from "react";
import { getCountryCallingCode, type Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { cn } from "@/lib/cn";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

type CountryOption = Readonly<{
  value?: Country;
  label: string;
  divider?: boolean;
}>;

type PhoneCountrySelectProps = Readonly<{
  value?: Country;
  onChange: (country?: Country) => void;
  options: readonly CountryOption[];
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  className?: string;
  "aria-label"?: string;
  onFocus?: FocusEventHandler<HTMLElement>;
  onBlur?: FocusEventHandler<HTMLElement>;
  iconComponent?: ElementType;
}>;

function CountryFlag({ country, label }: Readonly<{ country: Country; label: string }>) {
  const Flag = flags[country];

  if (!Flag) {
    return <span className="size-5 shrink-0 rounded-sm bg-muted" aria-hidden="true" />;
  }

  return (
    <span
      className="flex h-4 w-6 shrink-0 overflow-hidden rounded-[2px] [&_svg]:h-full [&_svg]:w-full"
      aria-hidden="true"
    >
      <Flag title={label} />
    </span>
  );
}

function isCountryOption(
  option: CountryOption,
): option is CountryOption & Readonly<{ value: Country }> {
  return !option.divider && Boolean(option.value);
}

export function PhoneCountrySelect({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  name,
  className,
  "aria-label": ariaLabel,
  onFocus,
  onBlur,
}: PhoneCountrySelectProps) {
  const countries = options.filter(isCountryOption);
  const selected = value ? countries.find((option) => option.value === value) : undefined;

  return (
    <Select
      {...(name ? { name } : {})}
      value={value ?? ""}
      onValueChange={(nextValue) => onChange(nextValue as Country)}
      disabled={Boolean(disabled || readOnly)}
    >
      <SelectTrigger
        aria-label={ariaLabel ?? "Kraj numeru telefonu"}
        {...(onFocus ? { onFocus } : {})}
        {...(onBlur ? { onBlur } : {})}
        className={cn(
          "h-full w-auto min-w-[7rem] shrink-0 rounded-none border-0 border-r border-border bg-transparent px-3 shadow-none focus-visible:border-border focus-visible:ring-0",
          className,
        )}
      >
        {selected && value ? (
          <span className="flex items-center gap-2">
            <CountryFlag country={value} label={selected.label} />
            <span className="font-medium">+{getCountryCallingCode(value)}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Kraj</span>
        )}
      </SelectTrigger>
      <SelectContent className="max-h-80 min-w-[18rem]">
        {countries.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <CountryFlag country={option.value} label={option.label} />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                +{getCountryCallingCode(option.value)}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
