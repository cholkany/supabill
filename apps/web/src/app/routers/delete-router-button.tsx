"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteRouterAction } from "./actions";

export function DeleteRouterButton({ routerId }: { routerId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await deleteRouterAction(routerId);
        })
      }
    >
      {isPending ? "Deleting…" : "Delete"}
    </Button>
  );
}
