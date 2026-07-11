"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function RejectButton({ onReject }: { onReject: () => void }) {
  const [kept, setKept] = useState(false);

  if (kept) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-status-good">
        <span aria-hidden="true">✓</span> Kept in your roadmap
      </span>
    );
  }

  return (
    <div className="flex gap-2">
      <Button type="button" variant="danger" onClick={onReject}>
        Reject
      </Button>
      <Button type="button" variant="success" onClick={() => setKept(true)}>
        Accept
      </Button>
    </div>
  );
}
