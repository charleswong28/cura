"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
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
import { ClientSelector, type SelectedClient } from "@/components/jobs/client-selector";
import {
  UsersDocument,
  type CreateJobInput,
  type JobPriority,
  type JobStatus,
  type UpdateJobInput,
  type UsersQuery,
  type UsersQueryVariables,
} from "@/graphql/generated/graphql";

const UNASSIGNED = "__unassigned__";

export interface JobFormValues {
  title: string;
  client: SelectedClient | null;
  description: string;
  requirements: string;
  status: JobStatus;
  priority: JobPriority;
  assignedToId: string | null;
}

export const EMPTY_JOB_FORM: JobFormValues = {
  title: "",
  client: null,
  description: "",
  requirements: "",
  status: "OPEN",
  priority: "MEDIUM",
  assignedToId: null,
};

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "FILLED", label: "Filled" },
  { value: "CLOSED", label: "Closed" },
];

const PRIORITY_OPTIONS: { value: JobPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export type JobFormErrors = Partial<Record<"title" | "client", string>>;

export function validateJobForm(v: JobFormValues): JobFormErrors {
  const errors: JobFormErrors = {};
  if (!v.title.trim()) errors.title = "Title is required";
  if (!v.client) errors.client = "Client is required";
  return errors;
}

interface JobFormProps {
  initial?: JobFormValues;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: JobFormValues) => void;
  onCancel?: () => void;
}

export function JobForm({ initial, submitLabel, submitting, onSubmit, onCancel }: JobFormProps) {
  const [values, setValues] = useState<JobFormValues>(initial ?? EMPTY_JOB_FORM);
  const [errors, setErrors] = useState<JobFormErrors>({});

  useEffect(() => {
    if (initial) setValues(initial);
  }, [initial]);

  const { user } = useAuth();
  const { data: usersData, loading: usersLoading } = useQuery<UsersQuery, UsersQueryVariables>(
    UsersDocument,
    { skip: !user }
  );

  const recruiters = (usersData?.users ?? []).filter((u) => u.loginable);

  function set<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (key === "title" && errors.title) setErrors((p) => ({ ...p, title: undefined }));
    if (key === "client" && errors.client) setErrors((p) => ({ ...p, client: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = validateJobForm(values);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="title">
          Title<span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          aria-invalid={errors.title ? true : undefined}
          placeholder="e.g. Senior Backend Engineer"
        />
        {errors.title ? <p className="text-destructive text-xs">{errors.title}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="client">
          Client<span className="text-destructive">*</span>
        </Label>
        <ClientSelector
          value={values.client}
          onChange={(c) => set("client", c)}
          error={errors.client}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select value={values.status} onValueChange={(v) => set("status", v as JobStatus)}>
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
        <div className="space-y-1.5">
          <Label htmlFor="priority">Priority</Label>
          <Select value={values.priority} onValueChange={(v) => set("priority", v as JobPriority)}>
            <SelectTrigger id="priority" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="recruiter">Assigned recruiter</Label>
        <Select
          value={values.assignedToId ?? UNASSIGNED}
          onValueChange={(v) => set("assignedToId", v === UNASSIGNED ? null : v)}
          disabled={usersLoading}
        >
          <SelectTrigger id="recruiter" className="w-full">
            <SelectValue placeholder={usersLoading ? "Loading…" : "Select a recruiter"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {recruiters.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {`${u.firstName} ${u.lastName}`.trim() || u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          rows={6}
          placeholder="Role overview, responsibilities, team context…"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="requirements">Requirements</Label>
        <Textarea
          id="requirements"
          value={values.requirements}
          onChange={(e) => set("requirements", e.target.value)}
          rows={6}
          placeholder="Skills, experience, must-haves…"
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

const opt = (s: string) => {
  const t = s.trim();
  return t.length > 0 ? t : undefined;
};

export function toCreateJobInput(v: JobFormValues): CreateJobInput {
  if (!v.client) throw new Error("Client must be selected before submitting");
  return {
    title: v.title.trim(),
    clientId: v.client.id,
    description: opt(v.description),
    requirements: opt(v.requirements),
    status: v.status,
    priority: v.priority,
    assignedToId: v.assignedToId ?? undefined,
  };
}

export function toUpdateJobInput(v: JobFormValues): UpdateJobInput {
  return {
    title: v.title.trim(),
    clientId: v.client?.id,
    description: opt(v.description) ?? null,
    requirements: opt(v.requirements) ?? null,
    status: v.status,
    priority: v.priority,
    assignedToId: v.assignedToId,
  };
}
