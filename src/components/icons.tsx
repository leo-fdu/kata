import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps: IconProps = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const SidebarIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M9 4v16" />
  </svg>
);

export const FolderIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M3.5 7.5h6l2-2h3l2 2h4v11h-17z" />
    <path d="M3.5 9h17" />
  </svg>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="m14.5 6-6 6 6 6" />
  </svg>
);

export const ChevronRightIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="m9.5 6 6 6-6 6" />
  </svg>
);

export const RotateIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M4.8 9A7.5 7.5 0 1 1 5 15" />
    <path d="M4.8 4v5h5" />
  </svg>
);

export const SparklesIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <path d="M12 3.5 13.2 8l4.3 1.5-4.3 1.5-1.2 4.5-1.2-4.5-4.3-1.5L10.8 8z" />
    <path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" />
  </svg>
);

export const EllipsisIcon = (props: IconProps) => (
  <svg {...baseProps} {...props}>
    <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);
