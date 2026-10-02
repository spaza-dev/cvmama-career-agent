import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "horizontal" | "square";
}

/**
 * CVmama brand logo component displaying the user's authentic brand image.
 * Uses the direct image asset sized responsively for desktop and mobile.
 */
export function Logo({ className = "", size = "md", variant = "horizontal" }: LogoProps) {
  // Height sizing for responsive display
  const heightClass =
    size === "sm" ? "h-6.5 sm:h-7" : size === "lg" ? "h-9 sm:h-10" : "h-7 sm:h-8";

  const imageSrc =
    variant === "square" ? "/cvmama_logo.png" : "/cvmama_logo_horizontal.png";

  return (
    <div className={`inline-flex items-center select-none shrink-0 ${className}`}>
      <img
        src={imageSrc}
        alt="CVmama"
        className={`${heightClass} w-auto object-contain rounded-md shadow-2xs`}
        loading="eager"
        decoding="async"
      />
    </div>
  );
}
