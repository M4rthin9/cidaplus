"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, FormBanner } from "@/components/ui/field";

/**
 * One restore button per row.
 *
 * `startTransition` around a server action refreshes the RSC payload, so the
 * restored row leaves this list without a manual reload — the same mechanism
 * the category reorder uses (CLAUDE.md, phase 4).
 */
export function RestoreButton({
  id,
  label,
  action,
}: {
  id: string;
  label: string;
  action: (id: string) => Promise<{ message?: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        aria-label={`กู้คืน ${label}`}
        onClick={() =>
          startTransition(async () => {
            const result = await action(id);
            // The action returns a message on refusal as well as on success;
            // only a row that is still here after the refresh actually failed.
            if (result?.message?.startsWith("ไม่พบ") || result?.message?.includes("ไม่ได้ถูกลบ")) {
              setError(result.message);
              return;
            }
            setError(null);
            router.refresh();
          })
        }
      >
        {pending ? "กำลังกู้คืน…" : "กู้คืน"}
      </Button>
      {error ? <FormBanner kind="error">{error}</FormBanner> : null}
    </>
  );
}
