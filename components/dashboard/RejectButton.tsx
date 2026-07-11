"use client";

import { Button } from "@/components/ui/Button";

export function RejectButton({ onReject, onAccept }: { onReject: () => void; onAccept: () => void }) {
  return (
    <div className="flex gap-2">
      <Button type="button" variant="danger" onClick={onReject}>
        Reject
      </Button>
      <Button type="button" variant="success" onClick={onAccept}>
        Accept
      </Button>
    </div>
  );
}
