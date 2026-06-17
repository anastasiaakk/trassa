import type { ReactNode } from "react";

type IconProps = {
  className?: string;
  size?: number;
};

function Svg({ className, size = 20, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export type AdminNavSection =
  | "home"
  | "settings"
  | "designSystem"
  | "users"
  | "specs"
  | "tables"
  | "map"
  | "orgs"
  | "release"
  | "devices"
  | "violations"
  | "account";

export function AdminNavIcon({ section, className, size }: IconProps & { section: AdminNavSection }) {
  switch (section) {
    case "home":
      return (
        <Svg className={className} size={size}>
          <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <rect x="11" y="11" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        </Svg>
      );
    case "settings":
      return (
        <Svg className={className} size={size}>
          <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M10 3.5V5.2M10 14.8V16.5M16.5 10H14.8M5.2 10H3.5M14.1 5.9L12.9 7.1M7.1 12.9L5.9 14.1M14.1 14.1L12.9 12.9M7.1 7.1L5.9 5.9"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </Svg>
      );
    case "designSystem":
      return (
        <Svg className={className} size={size}>
          <path
            d="M4 14L10 4L16 14H4Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="11.5" r="1.5" fill="currentColor" />
        </Svg>
      );
    case "users":
      return (
        <Svg className={className} size={size}>
          <circle cx="10" cy="7" r="2.75" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M4.5 16.5C5.4 13.8 7.5 12.25 10 12.25C12.5 12.25 14.6 13.8 15.5 16.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </Svg>
      );
    case "specs":
      return (
        <Svg className={className} size={size}>
          <path
            d="M5 4.5H15V15.5H5V4.5Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M7.5 8H12.5M7.5 11H10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </Svg>
      );
    case "tables":
      return (
        <Svg className={className} size={size}>
          <path
            d="M4 5.5H16M4 10H16M4 14.5H16M7 5.5V14.5M12 5.5V14.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </Svg>
      );
    case "map":
      return (
        <Svg className={className} size={size}>
          <path
            d="M4 6.5L8 4.75L12 6.5L16 4.75V14.5L12 16.25L8 14.5L4 16.25V6.5Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M8 4.75V14.5M12 6.5V16.25" stroke="currentColor" strokeWidth="1.4" />
        </Svg>
      );
    case "orgs":
      return (
        <Svg className={className} size={size}>
          <rect x="3.5" y="6" width="13" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M7 6V4.75C7 4.06 7.56 3.5 8.25 3.5H11.75C12.44 3.5 13 4.06 13 4.75V6" stroke="currentColor" strokeWidth="1.4" />
        </Svg>
      );
    case "release":
      return (
        <Svg className={className} size={size}>
          <path
            d="M10 4.5V11.5M10 11.5L7.5 9M10 11.5L12.5 9"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M5 14.5H15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </Svg>
      );
    case "devices":
      return (
        <Svg className={className} size={size}>
          <rect x="3.5" y="5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M7 5V3.75C7 3.06 7.56 2.5 8.25 2.5H11.75C12.44 2.5 13 3.06 13 3.75V5" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="10" cy="9.5" r="1.25" fill="currentColor" />
        </Svg>
      );
    case "violations":
      return (
        <Svg className={className} size={size}>
          <path
            d="M10 3.5L11.8 8.2H16.5L12.6 11L14.2 15.8L10 12.8L5.8 15.8L7.4 11L3.5 8.2H8.2L10 3.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M4 17.5H16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </Svg>
      );
    case "account":
      return (
        <Svg className={className} size={size}>
          <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="10" cy="8.25" r="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6.25 13.75C7.1 12.2 8.45 11.25 10 11.25C11.55 11.25 12.9 12.2 13.75 13.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </Svg>
      );
    default:
      return null;
  }
}

export function IconMapBack({ className, size }: IconProps) {
  return (
    <Svg className={className} size={size}>
      <path d="M8 5L4 10L8 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 10H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}
