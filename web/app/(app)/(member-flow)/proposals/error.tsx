"use client";

import { useEffect } from "react";
import { ErrorView } from "@/components/ui/error-view";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProposalsError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[ProposalsError]", error);
  }, [error]);

  return (
    <ErrorView
      heading="Couldn't load your proposals"
      description="We were unable to fetch your itinerary proposals. Please try again."
      reset={reset}
    />
  );
}
