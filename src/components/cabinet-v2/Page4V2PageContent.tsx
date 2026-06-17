import { memo, type ReactNode } from "react";
import { cx, type CabinetChromeClassNames } from "../../design-system/cabinetChromeClasses";

type Props = {
  title: string;
  lede?: string;
  children: ReactNode;
  className?: string;
  cn?: CabinetChromeClassNames;
};

/** Единая разметка подстраниц /page4 v2 — внутри page4-v2__main-region (KPI — сосед сверху). */
function Page4V2PageContent({ title, lede, children, className, cn }: Props) {
  return (
    <div className={cx("page4-v2__page", className)}>
      <header className="page4-v2__page-head">
        <h2 className={cx(cn?.recentTitle, "page4-v2__page-title")}>
          {title}
        </h2>
        {lede ? <p className="page4-v2__page-lede">{lede}</p> : null}
      </header>
      <div className="page4-v2__page-body">{children}</div>
    </div>
  );
}

export default memo(Page4V2PageContent);
