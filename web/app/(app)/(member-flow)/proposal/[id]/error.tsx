"use client";

import { useEffect } from "react";
import { ErrorView } from "@/components/ui/error-view";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProposalError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[ProposalError]", error);
  }, [error]);

  return (
    <ErrorView
      heading="Couldn't load this proposal"
      description="We were unable to fetch your itinerary. Please try again or return home."
      reset={reset}
    />
  );
}
