"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/context/AppStateContext";
import { ProgressView } from "@/components/progress/ProgressView";
import { Spinner } from "@/components/ui/Spinner";

export default function ProgressPage() {
  const { status, profile } = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (status === "ready" && !profile) {
      router.replace("/");
    }
  }, [status, profile, router]);

  if (status === "loading" || !profile) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <ProgressView />;
}
