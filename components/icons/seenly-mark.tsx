import type { SVGProps } from "react";

export function SeenlyMark({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      {...props}
    >
      <defs>
        <linearGradient
          id="seenly-mark-grad"
          x1="3"
          y1="3"
          x2="21"
          y2="21"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5.5"
        fill="url(#seenly-mark-grad)"
      />
      <path
        d="M15.6 8.2c-.85-.85-2.1-1.4-3.6-1.4-2.2 0-3.9 1.2-3.9 3 0 1.7 1.4 2.5 3.6 3 2.4.55 4.2 1.35 4.2 3.3 0 1.9-1.8 3.1-4.1 3.1-1.7 0-3.1-.6-4-1.55"
        stroke="var(--background, #ffffff)"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="18.5" cy="5.5" r="1.5" fill="currentColor" />
      <circle
        cx="18.5"
        cy="5.5"
        r="1.5"
        fill="var(--background, #ffffff)"
        fillOpacity="0.25"
      />
    </svg>
  );
}
