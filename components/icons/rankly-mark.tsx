import type { SVGProps } from "react";

export function RanklyMark({
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
          id="rankly-mark-grad"
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
        fill="url(#rankly-mark-grad)"
      />
      <rect
        x="6"
        y="14"
        width="2.6"
        height="4.5"
        rx="0.9"
        fill="var(--background, #ffffff)"
      />
      <rect
        x="10.7"
        y="11"
        width="2.6"
        height="7.5"
        rx="0.9"
        fill="var(--background, #ffffff)"
      />
      <rect
        x="15.4"
        y="7.5"
        width="2.6"
        height="11"
        rx="0.9"
        fill="var(--background, #ffffff)"
      />
      <path
        d="M6.2 11.2 L11.6 7.6 L17.4 4.8"
        stroke="var(--background, #ffffff)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.55"
      />
    </svg>
  );
}
