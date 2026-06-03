"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gem, Menu, LayoutDashboard, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_LINKS = [
  { href: "/concierge", label: "Concierge Dashboard", icon: LayoutDashboard },
  { href: "/proposals", label: "Member Proposals", icon: ClipboardList },
];

const linkBase =
  "transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm";

const getPortalLabel = (pathname: string): string => {
  if (pathname.startsWith("/proposal")) return "Member Portal";
  if (pathname.startsWith("/concierge")) return "Concierge Portal";
  return "ApexLux";
};

export const Header = (): React.ReactNode => {
  const pathname = usePathname();
  const portalLabel = getPortalLabel(pathname);

  return (
    <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
      <nav
        aria-label="Main navigation"
        className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6"
      >
        <Link
          href="/"
          aria-label="ApexLux — home"
          className={`flex items-center gap-2 text-lg font-semibold md:text-base ${linkBase}`}
        >
          <Gem className="h-5 w-5" aria-hidden="true" />
          <span className="font-semibold tracking-tight">ApexLux</span>
        </Link>

        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap ${linkBase} ${
                isActive ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden" aria-label="Open navigation menu">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <nav aria-label="Mobile navigation" className="grid gap-6 text-lg font-medium">
            <Link
              href="/"
              aria-label="ApexLux — home"
              className={`flex items-center gap-2 text-lg font-semibold ${linkBase}`}
            >
              <Gem className="h-5 w-5" aria-hidden="true" />
              <span>ApexLux</span>
            </Link>

            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2 ${linkBase} ${
                    isActive ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex justify-end w-full items-center gap-4 md:ml-auto">
        <span className="text-xs text-muted-foreground font-mono hidden md:block" aria-hidden="true">
          {portalLabel}
        </span>
      </div>
    </header>
  );
};
