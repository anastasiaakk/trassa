import type { ReactNode } from "react";

type IconProps = {
  className?: string;
  size?: number;
};

function Svg({ className, size = 18, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export type CabinetRailIconId =
  | "home"
  | "materials"
  | "messages"
  | "calendar"
  | "requests"
  | "portfolio"
  | "students"
  | "forms"
  | "teams"
  | "documents"
  | "proforientation"
  | "incoming"
  | "events"
  | "messenger"
  | "profile";

export function CabinetRailIcon({
  id,
  className,
  size,
}: IconProps & { id: CabinetRailIconId }) {
  const sw = 1.75;
  switch (id) {
    case "home":
      return (
        <Svg className={className} size={size}>
          <path
            d="M4 11 12 4l8 7v9H15v-6H9v6H4V11z"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "materials":
      return (
        <Svg className={className} size={size}>
          <path
            d="M6 5.5h9.5a1.5 1.5 0 0 1 1.5 1.5V19l-6-3-6 3V7a1.5 1.5 0 0 1 1.5-1.5Z"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path d="M12 11v5" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case "messages":
      return (
        <Svg className={className} size={size}>
          <path
            d="M4 6.5h16v11H8l-4 3.5V6.5Z"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path d="M8 11h8M8 14h5" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case "calendar":
      return (
        <Svg className={className} size={size}>
          <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth={sw} />
          <path d="M4 9.5h16M8 3v3M16 3v3" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <circle cx="9" cy="13.5" r="1" fill="currentColor" />
          <circle cx="12" cy="13.5" r="1" fill="currentColor" />
          <circle cx="15" cy="13.5" r="1" fill="currentColor" />
        </Svg>
      );
    case "requests":
      return (
        <Svg className={className} size={size}>
          <path
            d="M8 4.5h11.5a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19V7.5L8 4.5Z"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path d="M8 4.5V8H5M9 12h8M9 15.5h6" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case "portfolio":
      return (
        <Svg className={className} size={size}>
          <rect x="4" y="6" width="16" height="13" rx="2" stroke="currentColor" strokeWidth={sw} />
          <path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth={sw} />
          <path
            d="M12 11.5 13.4 14H10.6l1.4-2.5Z"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "students":
      return (
        <Svg className={className} size={size}>
          <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth={sw} />
          <circle cx="16" cy="10" r="2" stroke="currentColor" strokeWidth={sw} />
          <path
            d="M4.5 18.5c.8-2.5 2.6-3.75 4.5-3.75S12.7 16 13.5 18.5M13 18c.7-2 2-3 3.5-3 1.8 0 3.2 1.2 3.5 3"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "forms":
      return (
        <Svg className={className} size={size}>
          <path
            d="M5 5.5h14v13H5V5.5Z"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path d="M5 10h14M9.5 5.5v13M14.5 5.5v13" stroke="currentColor" strokeWidth={sw} />
        </Svg>
      );
    case "teams":
      return (
        <Svg className={className} size={size}>
          <circle cx="12" cy="8.5" r="2.5" stroke="currentColor" strokeWidth={sw} />
          <circle cx="7" cy="10" r="2" stroke="currentColor" strokeWidth={sw} />
          <circle cx="17" cy="10" r="2" stroke="currentColor" strokeWidth={sw} />
          <path
            d="M5 18.5c.6-2.2 2.2-3.5 4-3.5M15 15c1.8 0 3.4 1.3 4 3.5M9.5 15c1.8 0 3.4 1.3 4 3.5"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "documents":
      return (
        <Svg className={className} size={size}>
          <path
            d="M8 4.5h8l4 4.5V19.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path d="M16 4.5V9h4.5M9 12h6M9 15.5h4" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case "proforientation":
      return (
        <Svg className={className} size={size}>
          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth={sw} />
          <path
            d="M12 7v5l3.5 2"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M12 5.5v1.5M12 17v1.5M5 12H6.5M17.5 12H19" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case "incoming":
      return (
        <Svg className={className} size={size}>
          <path
            d="M4 8.5h16l-2 9H6l-2-9Z"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path d="M4 8.5 12 4l8 4.5M12 11v4M10.5 13.5 12 15.5 13.5 13.5" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "events":
      return (
        <Svg className={className} size={size}>
          <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth={sw} />
          <path d="M4 10h16M8 3v3M16 3v3" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <path
            d="M12 13.5 13.1 16h-2.2l1.1-2.5Z"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "messenger":
      return (
        <Svg className={className} size={size}>
          <path
            d="M5 6.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-5 3.5V8.5a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <path d="M9 11.5h6M9 14.5h4" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case "profile":
      return (
        <Svg className={className} size={size}>
          <circle cx="12" cy="9" r="3.25" stroke="currentColor" strokeWidth={sw} />
          <path
            d="M5.5 19.5c1.2-3.2 3.8-4.75 6.5-4.75s5.3 1.55 6.5 4.75"
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
          />
        </Svg>
      );
    default:
      return null;
  }
}
