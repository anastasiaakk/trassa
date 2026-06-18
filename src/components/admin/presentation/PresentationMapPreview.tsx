import { lazy, Suspense } from "react";
import type { MapPreviewSize } from "../PresentationRussiaMap";

const PresentationRussiaMap = lazy(() => import("../PresentationRussiaMap"));

export function MapPreview({
  className,
  size = "md",
  activeSubjectNames,
}: {
  className?: string;
  size?: MapPreviewSize;
  activeSubjectNames: string[];
}) {
  return (
    <Suspense
      fallback={
        <div
          className={`presentation-russia-map presentation-russia-map--fallback presentation-russia-map--${size} ${className ?? ""}`.trim()}
        >
          <span>Карта…</span>
        </div>
      }
    >
      <PresentationRussiaMap className={className} size={size} activeSubjectNames={activeSubjectNames} />
    </Suspense>
  );
}
