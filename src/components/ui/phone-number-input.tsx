"use client";

import PhoneInput, { type Value } from "react-phone-number-input";
import pl from "react-phone-number-input/locale/pl";

import { cn } from "@/lib/cn";
import { PhoneCountrySelect } from "@/components/ui/phone-country-select";

type PhoneNumberInputProps = Readonly<{
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  invalid?: boolean;
  describedBy?: string | undefined;
}>;

export function PhoneNumberInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  required,
  disabled,
  autoComplete,
  invalid,
  describedBy,
}: PhoneNumberInputProps) {
  const optionalProps = {
    ...(value ? { value: value as Value } : {}),
    ...(required !== undefined ? { required } : {}),
    ...(disabled !== undefined ? { disabled } : {}),
    ...(autoComplete !== undefined ? { autoComplete } : {}),
    ...(invalid ? { "aria-invalid": true as const } : {}),
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
  };

  return (
    <PhoneInput
      id={id}
      name={name}
      className={cn("pozytywka-phone-input", invalid && "pozytywka-phone-input--invalid")}
      defaultCountry="PL"
      international={false}
      addInternationalOption={false}
      labels={pl}
      countrySelectComponent={PhoneCountrySelect}
      smartCaret={false}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      onBlur={onBlur}
      {...optionalProps}
    />
  );
}
