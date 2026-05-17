"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClientStatus } from "@/graphql/generated/graphql";

export interface ClientFormValues {
  name: string;
  industry: string;
  website: string;
  phone: string;
  address: string;
  notes: string;
  status: ClientStatus;
}

export const EMPTY_FORM: ClientFormValues = {
  name: "",
  industry: "",
  website: "",
  phone: "",
  address: "",
  notes: "",
  status: "PROSPECT",
};

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: "PROSPECT", label: "Prospect" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

function validateUrl(value: string): string | null {
  if (!value) return null;
  try {
    // eslint-disable-next-line no-new
    new URL(value);
  } catch {
    return "Must be a valid URL (e.g. https://example.com)";
  }
  return null;
}

export type ClientFormErrors = Partial<Record<keyof ClientFormValues, string>>;

export function validateClientForm(v: ClientFormValues): ClientFormErrors {
  const errors: ClientFormErrors = {};
  if (!v.name.trim()) errors.name = "Client name is required";
  const websiteErr = validateUrl(v.website.trim());
  if (websiteErr) errors.website = websiteErr;
  return errors;
}

interface ClientFormProps {
  initial?: ClientFormValues;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: ClientFormValues) => void;
  onCancel?: () => void;
}

export function ClientForm({
  initial,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: ClientFormProps) {
  const [values, setValues] = useState<ClientFormValues>(initial ?? EMPTY_FORM);
  const [errors, setErrors] = useState<ClientFormErrors>({});

  useEffect(() => {
    if (initial) setValues(initial);
  }, [initial]);

  function set<K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = validateClientForm(values);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field
            id="name"
            label="Client name"
            required
            value={values.name}
            onChange={(v) => set("name", v)}
            error={errors.name}
          />
        </div>
        <Field
          id="industry"
          label="Industry"
          value={values.industry}
          onChange={(v) => set("industry", v)}
          placeholder="e.g. Fintech, Healthcare"
        />
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select value={values.status} onValueChange={(v) => set("status", v as ClientStatus)}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Field
          id="website"
          label="Website"
          value={values.website}
          onChange={(v) => set("website", v)}
          error={errors.website}
          placeholder="https://example.com"
        />
        <Field
          id="phone"
          label="Phone"
          value={values.phone}
          onChange={(v) => set("phone", v)}
          placeholder="+1 555-123-4567"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={values.address}
          onChange={(e) => set("address", e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={5}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            submitLabel
          )}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
}

function Field({ id, label, value, onChange, type, required, error, placeholder }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </Label>
      <Input
        id={id}
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        placeholder={placeholder}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

// Build a CreateClientInput / UpdateClientInput payload — trim everything,
// drop empties so the API treats them as omitted.
export function toClientInput(v: ClientFormValues) {
  const opt = (s: string) => {
    const t = s.trim();
    return t.length > 0 ? t : undefined;
  };
  return {
    name: v.name.trim(),
    industry: opt(v.industry),
    website: opt(v.website),
    phone: opt(v.phone),
    address: opt(v.address),
    notes: opt(v.notes),
    status: v.status,
  };
}
