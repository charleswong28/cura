"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Menu,
} from "lucide-react";
import { OrganizationSwitcher } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
];

const bottomNavItems = [{ href: "/settings", label: "Settings", icon: Settings }];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Main nav */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="space-y-1 px-2 pb-3">
        <Separator className="mb-2" />
        {bottomNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </>
  );
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-14 items-center gap-2 px-4">
        <span className="text-lg font-semibold text-sidebar-primary">C</span>
        {!collapsed && <span className="text-lg font-semibold text-sidebar-primary">Cura</span>}
      </div>

      <Separator />

      {/* Organization switcher */}
      <div className={cn("px-2 py-3", collapsed && "flex justify-center")}>
        <OrganizationSwitcher
          hidePersonal
          afterSelectOrganizationUrl="/dashboard"
          afterCreateOrganizationUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: cn("w-full", collapsed && "w-auto"),
              organizationSwitcherTrigger: cn(
                "w-full rounded-md border-sidebar-border",
                collapsed && "w-auto px-1 [&>span]:hidden [&>svg:last-child]:hidden"
              ),
            },
          }}
        />
      </div>

      <Separator />

      <SidebarNav collapsed={collapsed} />

      {/* Collapse toggle */}
      <div className="px-2 pb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className={cn(
            "w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed ? "justify-center px-0" : "justify-start gap-3 px-3"
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-64 bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        {/* Logo / Brand */}
        <div className="flex h-14 items-center gap-2 px-4">
          <span className="text-lg font-semibold text-sidebar-primary">C</span>
          <span className="text-lg font-semibold text-sidebar-primary">Cura</span>
        </div>

        <Separator />

        {/* Organization switcher */}
        <div className="px-2 py-3">
          <OrganizationSwitcher
            hidePersonal
            afterSelectOrganizationUrl="/dashboard"
            afterCreateOrganizationUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger: "w-full rounded-md",
              },
            }}
          />
        </div>

        <Separator />

        <SidebarNav collapsed={false} onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function MobileSidebarTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={onClick}>
      <Menu className="h-5 w-5" />
    </Button>
  );
}
