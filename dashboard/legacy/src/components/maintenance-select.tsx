"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { useState } from "react";
export const captureField = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 disabled:bg-slate-100";

export type SelectOption = { value: string; label: string };
const otherValue = "__other__";

export function MaintenanceSelectControl({ id, value, options, onChange, disabled, ariaLabel, labelledBy, invalid, describedBy, className = "" }: {
  id: string; value: string; options: SelectOption[]; onChange: (value: string) => void; disabled?: boolean;
  ariaLabel?: string; labelledBy?: string; invalid?: boolean; describedBy?: string; className?: string;
}) {
  const hasTone = /\bbg-/.test(className);
  return <SelectPrimitive.Root value={value} onValueChange={onChange} disabled={disabled}>
    <SelectPrimitive.Trigger id={id} aria-label={ariaLabel} aria-labelledby={labelledBy} aria-invalid={invalid || undefined} aria-describedby={describedBy}
      className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${hasTone ? "" : "border-slate-300 bg-white text-[#102c39]"} ${className}`}>
      <SelectPrimitive.Value placeholder="Select…" />
      <SelectPrimitive.Icon asChild><ChevronDown size={16} aria-hidden /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content position="popper" sideOffset={4} collisionPadding={8}
        className="z-[70] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
        <SelectPrimitive.Viewport>
          {options.map(option => <SelectPrimitive.Item key={option.value} value={option.value}
            className="relative flex min-h-11 cursor-pointer items-center rounded-lg py-2 pl-3 pr-9 text-sm text-[#102c39] outline-none data-[highlighted]:bg-teal-50 data-[state=checked]:font-semibold">
            <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
            <SelectPrimitive.ItemIndicator className="absolute right-3 text-teal-800"><Check size={16} aria-hidden /></SelectPrimitive.ItemIndicator>
          </SelectPrimitive.Item>)}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>;
}

export function MaintenanceSelectField({ name, label, value, options, onChange, disabled, error, className }: {
  name: string; label: string; value: string; options: string[] | SelectOption[]; onChange: (value: string) => void;
  disabled?: boolean; error?: string; className?: string;
}) {
  const choices = options.map(option => typeof option === "string" ? { value: option, label: option } : option);
  return <div>
    <label id={`${name}-label`} htmlFor={name} className="text-sm font-medium">{label}</label>
    <MaintenanceSelectControl id={name} value={value} options={choices} onChange={onChange} disabled={disabled}
      labelledBy={`${name}-label`} invalid={Boolean(error)} describedBy={error ? `${name}-error` : undefined} className={`mt-1 ${className ?? ""}`} />
    {error && <div id={`${name}-error`} className="mt-1 text-sm text-red-800">{error}</div>}
  </div>;
}

export function MaintenanceChoiceField({ name, label, value, values, onChange, error, disabled }: {
  name: string; label: string; value: string; values: string[]; onChange: (value: string) => void; error?: string; disabled?: boolean;
}) {
  const [custom, setCustom] = useState(false);
  const choices = [...new Set(values.filter(Boolean))];
  const needsCustom = custom || Boolean(value && !choices.includes(value));
  const options = [...choices.map(choice => ({ value: choice, label: choice })), { value: otherValue, label: `Other ${label.toLowerCase()}…` }];
  return <div>
    <label id={`${name}-label`} htmlFor={name} className="text-sm font-medium">{label}</label>
    <MaintenanceSelectControl id={name} value={needsCustom ? otherValue : value} options={options}
      onChange={choice => { if (choice === otherValue) { setCustom(true); onChange(""); } else { setCustom(false); onChange(choice); } }}
      disabled={disabled} labelledBy={`${name}-label`} invalid={Boolean(error)} describedBy={error ? `${name}-error` : undefined} className="mt-1" />
    {needsCustom && <input aria-label={`Specify ${label.toLowerCase()}`} value={value} onChange={event => onChange(event.target.value)}
      disabled={disabled} className={`${captureField} mt-2`} maxLength={120} />}
    {error && <div id={`${name}-error`} className="mt-1 text-sm text-red-800">{error}</div>}
  </div>;
}
