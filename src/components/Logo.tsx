import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showBg?: boolean;
}

export function Logo({ className = "", size = "md", showBg = false }: LogoProps) {
  const heightClass = size === "sm" ? "h-6" : size === "lg" ? "h-10" : "h-7";

  return (
    <div className={`inline-flex items-center gap-2 ${showBg ? "p-1.5 rounded-xl bg-[#4898AD] text-white" : "text-kumo-default"} ${className}`}>
      <svg
        viewBox="0 0 220 54"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${heightClass} w-auto transition-colors`}
      >
        <g fill="currentColor">
          {/* C */}
          <text x="5" y="38" fontFamily="'Outfit', sans-serif" fontWeight="600" fontSize="36">
            C
          </text>

          {/* V with graduation cap */}
          <g transform="translate(32, 0)">
            <path d="M16 10L4 15.5L16 21L28 15.5L16 10Z" fill="currentColor" opacity="0.9" />
            <path
              d="M10 18.5V22.5C10 24.5 12.7 25.5 16 25.5C19.3 25.5 22 24.5 22 22.5V18.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <path d="M26 16.5V23.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <text x="4" y="38" fontFamily="'Outfit', sans-serif" fontWeight="500" fontSize="36">
              V
            </text>
          </g>

          {/* mama */}
          <text
            x="68"
            y="38"
            fontFamily="'Georgia', 'Playfair Display', serif"
            fontWeight="500"
            fontSize="34"
            letterSpacing="0.5"
          >
            mama
          </text>
        </g>
      </svg>
    </div>
  );
}
