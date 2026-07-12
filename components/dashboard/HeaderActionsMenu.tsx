"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/ui/Modal";
import { AuthForm } from "@/components/auth/AuthForm";

interface HeaderActionsMenuProps {
  onOpenSettings: () => void;
}

export function HeaderActionsMenu({ onOpenSettings }: HeaderActionsMenuProps) {
  const { user, authLoading, authEnabled, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  function openSettings() {
    setOpen(false);
    onOpenSettings();
  }

  function openAuth() {
    setOpen(false);
    setAuthOpen(true);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-brand-900 shadow-sm transition-colors hover:bg-brand-100 dark:border-white/15 dark:bg-white/10 dark:text-brand-100 dark:hover:bg-white/15"
      >
        <span className="flex w-5 flex-col gap-1" aria-hidden="true">
          <span className="h-0.5 rounded-full bg-current" />
          <span className="h-0.5 rounded-full bg-current" />
          <span className="h-0.5 rounded-full bg-current" />
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/15 dark:bg-[#101713]">
          <div className="flex flex-col py-1 text-sm">
            <button
              type="button"
              onClick={openSettings}
              className="px-4 py-3 text-left font-medium text-brand-800 hover:bg-brand-100 dark:text-brand-150 dark:hover:bg-white/10"
            >
              Settings
            </button>

            {authEnabled && !authLoading && user ? (
              <div className="border-t border-black/10 px-4 py-3 dark:border-white/10">
                <p className="truncate text-xs text-black/45 dark:text-white/45">{user.email}</p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void signOut();
                  }}
                  className="mt-2 text-sm font-medium text-status-critical underline underline-offset-2"
                >
                  Sign out
                </button>
              </div>
            ) : null}

            {authEnabled && !authLoading && !user ? (
              <button
                type="button"
                onClick={openAuth}
                className="border-t border-black/10 px-4 py-3 text-left font-medium text-brand-800 hover:bg-brand-100 dark:border-white/10 dark:text-brand-150 dark:hover:bg-white/10"
              >
                Sign in to save your roadmap
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Modal open={authOpen} onClose={() => setAuthOpen(false)} title="Sign in to EcoStep">
        <AuthForm onSuccess={() => setAuthOpen(false)} />
      </Modal>
    </div>
  );
}
