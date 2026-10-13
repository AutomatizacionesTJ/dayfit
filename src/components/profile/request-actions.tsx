"use client";

import { useState, useTransition } from "react";
import { acceptRequest, removeFollower } from "@/app/(app)/follow-actions";
import { Button } from "@/components/ui";

export function RequestActions({ followerId }: { followerId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function run(action: (id: string) => Promise<{ error?: string }>) {
    setError(undefined);
    startTransition(async () => {
      const result = await action(followerId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button className="h-9 px-4" disabled={pending} onClick={() => run(acceptRequest)}>
          Aceptar
        </Button>
        <Button variant="secondary" className="h-9 px-4" disabled={pending} onClick={() => run(removeFollower)}>
          Rechazar
        </Button>
      </div>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
