import { memo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/** Одна стеклянная панель для «Главной» и всех разделов /page4 (как page5-v2__main-region). */
function Page4V2MainRegion({ children }: Props) {
  return (
    <div className="page4-v2__main-region page4-v2-dashboard__panel">{children}</div>
  );
}

export default memo(Page4V2MainRegion);
