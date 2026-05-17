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
import type { CandidateStatus } from "@/graphql/generated/graphql";

export interface CandidateFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentCompany: string;
  currentTitle: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  notes: string;
  status: CandidateStatus;
}

export const EMPTY_FORM: CandidateFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  currentCompany: "",
  currentTitle: "",
  location: "",
  linkedinUrl: "",
  githubUrl: "",
  notes: "",
  status: "ACTIVE",
};

const STATUS_OPTIONS: { value: CandidateStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "PLACED", label: "Placed" },
  { value: "BLACKLISTED", label: "Blacklisted" },
];

// Matches the API DTO (`@Matches(/^\+?[1-9][\d\s\-(). ]{5,28}$/)`).
const PHONE_RE = /^\+?[1-9][\d\s\-(). ]{5,28}$/;
// Matches the API DTO (`@IsEmail`).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateHttpsUrl(value: string): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Must be a valid URL (e.g. https://example.com)";
  }
  if (url.protocol !== "https:") return "URL must use https://";
  return null;
}

export type CandidateFormErrors = Partial<Record<keyof CandidateFormValues, string>>;

export function validateCandidateForm(v: CandidateFormValues): CandidateFormErrors {
  const errors: CandidateFormErrors = {};
  if (!v.firstName.trim()) errors.firstName = "First name is required";
  if (!v.lastName.trim()) errors.lastName = "Last name is required";
  if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) errors.email = "Invalid email address";
  if (v.phone.trim() && !PHONE_RE.test(v.phone.trim())) {
    errors.phone = "Invalid phone (e.g. +1 555-123-4567)";
  }
  const linkedinErr = validateHttpsUrl(v.linkedinUrl.trim());
  if (linkedinErr) errors.linkedinUrl = linkedinErr;
  const githubErr = validateHttpsUrl(v.githubUrl.trim());
  if (githubErr) errors.githubUrl = githubErr;
  return errors;
}

interface CandidateFormProps {
  initial?: CandidateFormValues;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: CandidateFormValues) => void;
  onCancel?: () => void;
}

export function CandidateForm({
  initial,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: CandidateFormProps) {
  const [values, setValues] = useState<CandidateFormValues>(initial ?? EMPTY_FORM);
  const [errors, setErrors] = useState<CandidateFormErrors>({});

  useEffect(() => {
    if (initial) setValues(initial);
  }, [initial]);

  function set<K extends keyof CandidateFormValues>(key: K, value: CandidateFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = validateCandidateForm(values);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="firstName"
          label="First name"
          required
          value={values.firstName}
          onChange={(v) => set("firstName", v)}
          error={errors.firstName}
        />
        <Field
          id="lastName"
          label="Last name"
          required
          value={values.lastName}
          onChange={(v) => set("lastName", v)}
          error={errors.lastName}
        />
        <Field
          id="email"
          label="Email"
          type="email"
          value={values.email}
          onChange={(v) => set("email", v)}
          error={errors.email}
        />
        <Field
          id="phone"
          label="Phone"
          value={values.phone}
          onChange={(v) => set("phone", v)}
          error={errors.phone}
          placeholder="+1 555-123-4567"
        />
        <Field
          id="currentCompany"
          label="Current company"
          value={values.currentCompany}
          onChange={(v) => set("currentCompany", v)}
        />
        <Field
          id="currentTitle"
          label="Current title"
          value={values.currentTitle}
          onChange={(v) => set("currentTitle", v)}
        />
        <Field
          id="location"
          label="Location"
          value={values.location}
          onChange={(v) => set("location", v)}
        />
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select value={values.status} onValueChange={(v) => set("status", v as CandidateStatus)}>
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
          id="linkedinUrl"
          label="LinkedIn URL"
          value={values.linkedinUrl}
          onChange={(v) => set("linkedinUrl", v)}
          error={errors.linkedinUrl}
          placeholder="https://www.linkedin.com/in/…"
        />
        <Field
          id="githubUrl"
          label="GitHub URL"
          value={values.githubUrl}
          onChange={(v) => set("githubUrl", v)}
          error={errors.githubUrl}
          placeholder="https://github.com/…"
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

// Build a CreateCandidateInput / UpdateCandidateInput payload — trim everything,
// drop empties so the API treats them as omitted, and never send fields the
// API DTO can't validate as a nullable optional.
export function toCandidateInput(v: CandidateFormValues) {
  const opt = (s: string) => {
    const t = s.trim();
    return t.length > 0 ? t : undefined;
  };
  return {
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    email: opt(v.email),
    phone: opt(v.phone),
    currentCompany: opt(v.currentCompany),
    currentTitle: opt(v.currentTitle),
    location: opt(v.location),
    linkedinUrl: opt(v.linkedinUrl),
    githubUrl: opt(v.githubUrl),
    notes: opt(v.notes),
    status: v.status,
  };
}
