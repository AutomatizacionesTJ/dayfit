"use client";

import { useState, useTransition } from "react";
import { follow, unfollow } from "@/app/(app)/follow-actions";
import { Button } from "@/components/ui";
import type { FollowStatus } from "@/lib/supabase/database.types";

export function FollowButton({
  targetId,
  status,
  isPrivate,
  username,
}: {
  targetId: string;
  status: FollowStatus | null;
  isPrivate: boolean;
  username: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function run(action: () => Promise<{ error?: string }>) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  function onUnfollow() {
    // En una cuenta privada, volver a seguir exige una nueva solicitud
    if (isPrivate && !window.confirm(`¿Dejar de seguir a @${username}? Tendrás que volver a pedirlo.`)) return;
    run(() => unfollow(targetId));
  }

  let button;
  if (status === "accepted") {
    button = (
      <Button variant="secondary" className="h-10 w-full" disabled={pending} onClick={onUnfollow}>
        Siguiendo
      </Button>
    );
  } else if (status === "pending") {
    button = (
      <Button variant="secondary" className="h-10 w-full text-fg-soft" disabled={pending} onClick={() => run(() => unfollow(targetId))}>
        Solicitado
      </Button>
    );
  } else {
    button = (
      <Button className="h-10 w-full" disabled={pending} onClick={() => run(() => follow(targetId))}>
        {isPrivate ? "Solicitar seguir" : "Seguir"}
      </Button>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-1">
      {button}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
