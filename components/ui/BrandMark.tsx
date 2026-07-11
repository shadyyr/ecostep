"use client";

import Image from "next/image";

type BrandMarkSize = "sm" | "md" | "lg";
type BrandMarkVariant = "badge" | "plain";

const sizeClasses: Record<BrandMarkSize, string> = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

const imageDimensions: Record<BrandMarkSize, number> = {
  sm: 36,
  md: 48,
  lg: 64,
};

interface BrandMarkProps {
  size?: BrandMarkSize;
  variant?: BrandMarkVariant;
  className?: string;
  priority?: boolean;
}

export function BrandMark({
  size = "md",
  variant = "badge",
  className = "",
  priority = false,
}: BrandMarkProps) {
  const dimension = imageDimensions[size];
  const variantClass =
    variant === "badge"
      ? "overflow-hidden rounded-full border border-brand-250/40 bg-black p-1 shadow-sm"
      : "";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${variantClass} ${sizeClasses[size]} ${className}`}
    >
      <Image
        src="/ecostep-mark.png"
        alt=""
        width={dimension}
        height={dimension}
        priority={priority}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
