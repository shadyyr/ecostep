"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/ui/Modal";
import { AuthForm } from "@/components/auth/AuthForm";

export function AccountMenu() {
  const { user, authLoading, authEnabled, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!authEnabled) return null;
  if (authLoading) return null;

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-brand-700 underline underline-offset-2 dark:text-brand-250"
        >
          Sign in to save your roadmap
        </button>
        <Modal open={open} onClose={() => setOpen(false)} title="Sign in to EcoStep">
          <AuthForm onSuccess={() => setOpen(false)} />
        </Modal>
      </>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
      <span className="max-w-[10rem] truncate">{user.email}</span>
      <button
        type="button"
        onClick={() => signOut()}
        className="underline underline-offset-2 hover:text-black/80 dark:hover:text-white/80"
      >
        Sign out
      </button>
    </div>
  );
}
