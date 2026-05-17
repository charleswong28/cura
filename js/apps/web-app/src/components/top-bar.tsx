"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  candidates: "Candidates",
  clients: "Clients",
  jobs: "Jobs",
  settings: "Settings",
  profile: "Profile",
  new: "New",
};

interface TopBarProps {
  onCommandPaletteOpen: () => void;
  mobileNavTrigger?: React.ReactNode;
}

export function TopBar({ onCommandPaletteOpen, mobileNavTrigger }: TopBarProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 md:px-6">
      {/* Left side: mobile menu + breadcrumbs */}
      <div className="flex items-center gap-2">
        {mobileNavTrigger}
        <Breadcrumb>
          <BreadcrumbList>
            {segments.map((segment, index) => {
              const href = "/" + segments.slice(0, index + 1).join("/");
              const label = routeLabels[segment] ?? segment;
              const isLast = index === segments.length - 1;

              return (
                <Fragment key={href}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={href}>{label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right side: search trigger (user avatar/logout lives in sidebar) */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-2 text-muted-foreground sm:flex"
          onClick={onCommandPaletteOpen}
        >
          <Search className="h-4 w-4" />
          <span className="text-xs">Search...</span>
          <kbd className="pointer-events-none ml-2 inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
        <Button variant="ghost" size="icon-sm" className="sm:hidden" onClick={onCommandPaletteOpen}>
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
