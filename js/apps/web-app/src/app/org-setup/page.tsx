import { redirect } from "next/navigation";

// Multi-tenancy is handled via JWT tenantSlug at login — no org setup page needed.
export default function OrgSetupPage() {
  redirect("/dashboard");
}
