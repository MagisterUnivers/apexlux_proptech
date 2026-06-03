"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  heading?: string;
  description?: string;
  reset?: () => void;
}

export const ErrorView = ({
  heading = "Something went wrong",
  description = "We couldn't load this page. This may be a temporary issue.",
  reset,
}: Props) => {
  return (
    <section
      aria-label="Error"
      className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6 py-16 text-center gap-6"
    >
      <div
        aria-hidden="true"
        className="flex items-center justify-center w-14 h-14 rounded-xl bg-destructive/10 text-destructive"
      >
        <AlertTriangle className="h-6 w-6" />
      </div>

      <div className="flex flex-col gap-2 max-w-sm">
        <h1 className="text-xl font-semibold">{heading}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex items-center gap-3">
        {reset && (
          <Button variant="outline" size="sm" onClick={reset} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </Button>
        )}
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/">
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            Go home
          </Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground font-mono opacity-40" aria-hidden="true">
        ApexLux · Exclusive Resorts
      </p>
    </section>
  );
};
