"use client";

import { useEffect } from "react";
import { ErrorView } from "@/components/ui/error-view";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ConciergeError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[ConciergeError]", error);
  }, [error]);

  return (
    <ErrorView
      heading="Couldn't load the dashboard"
      description="We were unable to fetch reservation or proposal data. Check that the API is running and try again."
      reset={reset}
    />
  );
}
