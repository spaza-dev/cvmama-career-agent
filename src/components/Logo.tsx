import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showBg?: boolean;
}

export function Logo({ className = "", size = "md", showBg = false }: LogoProps) {
  const heightClass = size === "sm" ? "h-6" : size === "lg" ? "h-10" : "h-8";

  return (
    <div
      className={`inline-flex items-center ${
        showBg ? "p-1.5 rounded-xl bg-[#58A8C4] text-white shadow-sm" : "bg-transparent text-current"
      } ${className}`}
    >
      <svg
        viewBox="0 0 320 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${heightClass} w-auto transition-colors`}
        aria-label="CVmama"
      >
        <g fill="currentColor">
          {/* Letter C */}
          <path d="M46 22.5 C40 16 30 14 20 19 C9 24.5 3 36 3 49 C3 62 10 73 22 77.5 C32 81 41 78.5 48 72 L42 66.5 C36 71.5 29 73.5 22 70.5 C14 67 9 58.5 9 49 C9 39 14 30.5 22 26.5 C29 23 37 24.5 42 29 Z" />

          {/* Monogram V with Calligraphic Loop & Flourish */}
          <path d="M57 39 C54 39 52 37 52 33.5 C52 29 55.5 25.5 60.5 25.5 C66 25.5 69.5 29 70 34 C70.5 39 68 45 64.5 50.5 L73 66 C73.5 67 74.5 67.5 75.5 67 C76.5 66.5 77 65.5 77.5 64.5 L91 32 C91.5 30.5 93 29.5 95 30 C97 30.5 98 32 97.5 34 L82 71 C80.5 74.5 76 76 72.5 74 C70 72.5 68.5 69.5 67.5 66.5 L60.5 54 C64 48 66 42.5 65.5 37 C65 33 63 30.5 60 30.5 C58 30.5 56.5 31.8 56.5 33.5 C56.5 35 57.5 36.5 58.5 37 Z" />
          
          {/* Right Upper Flourish of V */}
          <path d="M92 34 C94 28 98 24 104 23.5 C102.5 26.5 100 29.5 97.5 34 Z" opacity="0.9" />

          {/* Graduation Cap Emblem Centered over V */}
          <g transform="translate(68, 6)">
            {/* Mortarboard Diamond */}
            <polygon points="16,3 31,9.5 16,16 1,9.5" fill="currentColor" />
            
            {/* Skullcap Band Underneath */}
            <path
              d="M8 12.5 V17.5 C8 21.5 11.5 23.5 16 23.5 C20.5 23.5 24 21.5 24 17.5 V12.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            
            {/* Tassel on Right */}
            <path d="M29 11.5 V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="29" cy="22" r="1.5" fill="currentColor" />
          </g>

          {/* Wordmark "mama" in Refined Serif Typography */}
          {/* First 'm' */}
          <g transform="translate(108, 0)">
            <rect x="2" y="33" width="5.5" height="38" />
            <path d="M0 33 H9.5 M0 71 H9.5" stroke="currentColor" strokeWidth="2" />
            <path d="M6 42 C9 35 15 32 21 32 C27 32 30 36 30.5 42 V71" stroke="currentColor" strokeWidth="5" strokeLinecap="butt" fill="none" />
            <path d="M30 42 C33 35 39 32 45 32 C51 32 54 36 54.5 42 V71" stroke="currentColor" strokeWidth="5" strokeLinecap="butt" fill="none" />
            <path d="M25 71 H35 M49 71 H59" stroke="currentColor" strokeWidth="2" />
          </g>

          {/* First 'a' */}
          <g transform="translate(173, 0)">
            <path d="M19 46 C19 39 12 36 6 38 C1 40 -1 44 -1 48 C-1 56 6 59 13 58 C17 57.5 19 55 19 51 Z" fill="none" stroke="currentColor" strokeWidth="4.5" />
            <path d="M19 42 C19 34 14 31 7 31 C2 31 -1 33.5 -1 35.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle cx="-1" cy="35.5" r="2.8" fill="currentColor" />
            <path d="M19 33 V67 C19 69.5 21 71.5 24 71.5" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          </g>

          {/* Second 'm' */}
          <g transform="translate(204, 0)">
            <rect x="2" y="33" width="5.5" height="38" />
            <path d="M0 33 H9.5 M0 71 H9.5" stroke="currentColor" strokeWidth="2" />
            <path d="M6 42 C9 35 15 32 21 32 C27 32 30 36 30.5 42 V71" stroke="currentColor" strokeWidth="5" strokeLinecap="butt" fill="none" />
            <path d="M30 42 C33 35 39 32 45 32 C51 32 54 36 54.5 42 V71" stroke="currentColor" strokeWidth="5" strokeLinecap="butt" fill="none" />
            <path d="M25 71 H35 M49 71 H59" stroke="currentColor" strokeWidth="2" />
          </g>

          {/* Second 'a' */}
          <g transform="translate(269, 0)">
            <path d="M19 46 C19 39 12 36 6 38 C1 40 -1 44 -1 48 C-1 56 6 59 13 58 C17 57.5 19 55 19 51 Z" fill="none" stroke="currentColor" strokeWidth="4.5" />
            <path d="M19 42 C19 34 14 31 7 31 C2 31 -1 33.5 -1 35.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle cx="-1" cy="35.5" r="2.8" fill="currentColor" />
            <path d="M19 33 V67 C19 69.5 21 71.5 24 71.5" stroke="currentColor" strokeWidth="4.5" stroke-linecap="round" fill="none" />
          </g>
        </g>
      </svg>
    </div>
  );
}
