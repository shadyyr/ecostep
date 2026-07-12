"use client";

import { Button } from "@/components/ui/Button";

export function RejectButton({
  onReject,
  onAccept,
  acceptDisabled = false,
  acceptTitle,
}: {
  onReject: () => void;
  onAccept: () => void;
  acceptDisabled?: boolean;
  acceptTitle?: string;
}) {
  return (
    <div className="flex gap-2">
      <Button type="button" variant="danger" onClick={onReject}>
        Reject
      </Button>
      <Button
        type="button"
        variant="success"
        onClick={onAccept}
        disabled={acceptDisabled}
        title={acceptTitle}
      >
        Accept
      </Button>
    </div>
  );
}
