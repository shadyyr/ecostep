"use client";

import { useAppState } from "@/context/AppStateContext";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { Spinner } from "@/components/ui/Spinner";

export default function Home() {
  const { status, profile } = useAppState();

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {profile ? <Dashboard /> : <OnboardingForm />}
    </div>
  );
}
