import { memo, useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { cx } from "../design-system/cabinetChromeClasses";
import type { CabinetChromeClassNames } from "../design-system/cabinetChromeClasses";
import Page4V2PageContent from "../components/cabinet-v2/Page4V2PageContent";
import { loadProfileSettings } from "../profileSettingsStorage";
import {
  DISTRIBUTION_PROPOSALS_CHANGED,
  formatRecommendationDate,
  loadContractorRecommendations,
  markContractorRecommendationsSeen,
  studentDisplayName,
  type ContractorRecommendation,
} from "../utils/distributionRecommendations";
import { usePortalDesign } from "../design-system/usePortalDesign";
import { page4V2PanelStyle } from "../utils/page4V2PanelStyle";

const PAGE_LEDE =
  "Здесь отображаются студенты вашей спецификации, которых администратор рекомендовал именно вашей организации. Новые подборки появляются после уведомления на главной кабинета.";

type ThemeStyles = {
  text: string;
  muted: string;
  cardBg: string;
  sectionBg: string;
  insetShadow: string;
  cardShadow: string;
};

type Props = {
  styles: ThemeStyles;
  layoutStyles: Record<string, CSSProperties>;
  cn?: CabinetChromeClassNames;
  isV2?: boolean;
};

const ContractorRecommendationsView = memo(function ContractorRecommendationsView({
  styles,
  layoutStyles,
  cn,
  isV2: isV2Prop,
}: Props) {
  const portalIsV2 = usePortalDesign() === "v2";
  const isV2 = isV2Prop === true || portalIsV2;
  const [items, setItems] = useState<ContractorRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const email = loadProfileSettings().email.trim();
    if (!email) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const list = await loadContractorRecommendations(email);
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
    const email = loadProfileSettings().email.trim();
    if (email) markContractorRecommendationsSeen(email);
    const onChange = () => void reload();
    window.addEventListener(DISTRIBUTION_PROPOSALS_CHANGED, onChange);
    window.addEventListener("trassa-profile-saved", onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener(DISTRIBUTION_PROPOSALS_CHANGED, onChange);
      window.removeEventListener("trassa-profile-saved", onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [reload]);

  const body = loading ? (
    <p style={{ color: styles.muted, fontSize: 14 }}>Загрузка…</p>
  ) : items.length === 0 ? (
    <div
      style={{
        padding: 20,
        borderRadius: 20,
        background: styles.sectionBg,
        boxShadow: styles.insetShadow,
        color: styles.muted,
        fontSize: 14,
      }}
    >
      Пока нет рекомендаций.
    </div>
  ) : (
    <div style={{ display: "grid", gap: 14 }}>
      {items.map((row) => (
        <article
          key={row.proposalId}
          className={isV2 ? "page4-v2__list-item-card" : undefined}
          style={{
            padding: 18,
            borderRadius: 22,
            background: styles.cardBg,
            boxShadow: styles.cardShadow,
            textAlign: "left",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: styles.muted, letterSpacing: "0.05em" }}>
            {row.specializationTitle}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: styles.text, marginTop: 6 }}>
            {studentDisplayName(row)}
          </div>
          <div style={{ fontSize: 13, color: styles.muted, marginTop: 8, lineHeight: 1.5 }}>
            {row.student.email}
            {row.student.phone ? ` · ${row.student.phone}` : ""}
          </div>
          <div style={{ fontSize: 12, color: styles.muted, marginTop: 6 }}>
            Рекомендация от {formatRecommendationDate(row.createdAt)}
          </div>
          {row.note.trim() ? (
            <p
              style={{
                margin: "12px 0 0",
                fontSize: 14,
                lineHeight: 1.65,
                color: styles.text,
                whiteSpace: "pre-wrap",
              }}
            >
              {row.note}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );

  if (isV2) {
    return (
      <Page4V2PageContent
        title="Студенты"
        lede={PAGE_LEDE}
        cn={cn}
        className="page4-v2__recommendations"
      >
        {body}
      </Page4V2PageContent>
    );
  }

  return (
    <div
      className={cx(cn?.recentPanel)}
      style={page4V2PanelStyle(layoutStyles, false)}
    >
      <div className={cn?.recentTitle} style={layoutStyles.recentTitle ?? {}}>
        Студенты
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: styles.muted, margin: "0 0 18px" }}>{PAGE_LEDE}</p>
      {body}
    </div>
  );
});

export default ContractorRecommendationsView;
