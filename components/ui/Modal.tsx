"use client";

import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-black/25 bg-white p-5 shadow-lg sm:rounded-2xl dark:border-white/20 dark:bg-[#111814]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-black/20 p-1.5 text-black/80 hover:bg-black/10 dark:border-white/20 dark:text-white/80 dark:hover:bg-white/10"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
