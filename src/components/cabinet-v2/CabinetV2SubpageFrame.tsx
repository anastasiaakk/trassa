import { memo, type ReactNode } from "react";
import type { CabinetChromeContext } from "../CabinetChromeLayout";
import Page4V2MainRegion from "./Page4V2MainRegion";

type Props = {
  ctx: CabinetChromeContext;
  children: ReactNode;
  showContextStrip?: boolean;
  title?: string;
  lede?: string;
};

function CabinetV2SubpageFrame({ ctx: _ctx, children, showContextStrip, title, lede }: Props) {
  const stripVisible = showContextStrip ?? Boolean(title);
  return (
    <Page4V2MainRegion>
      {stripVisible && title ? (
        <div className="cabinet-v2-dashboard__context-strip" aria-label={title}>
          <p className="cabinet-v2-dashboard__context-kicker">{title}</p>
          {lede ? <p className="cabinet-v2-dashboard__context-lede">{lede}</p> : null}
        </div>
      ) : null}
      {children}
    </Page4V2MainRegion>
  );
}

export default memo(CabinetV2SubpageFrame);
