import { memo, useMemo, type CSSProperties } from "react";
import type { CabinetChromeStyles } from "../components/CabinetChromeLayout";
import { loadProfileSettings } from "../profileSettingsStorage";
import { cx, type CabinetChromeClassNames } from "../design-system/cabinetChromeClasses";
import Page4V2PageContent from "../components/cabinet-v2/Page4V2PageContent";
import { usePortalDesign } from "../design-system/usePortalDesign";
import { page4V2PanelStyle } from "../utils/page4V2PanelStyle";
import { PAGE_LEDE } from "../utils/contractorFormsViewUtils";
import { buildCabinetAccentTheme } from "../theme/cabinetAccentTheme";
import { useContractorForms } from "../hooks/useContractorForms";
import ContractorFormsAlerts from "../components/contractor/ContractorFormsAlerts";
import ContractorFormsTemplateList from "../components/contractor/ContractorFormsTemplateList";
import ContractorFormsEditor from "../components/contractor/ContractorFormsEditor";
import ContractorFormsToast from "../components/contractor/ContractorFormsToast";
import css from "./ContractorFormsView.module.css";

type Props = {
  styles: CabinetChromeStyles;
  layoutStyles: Record<string, CSSProperties>;
  cn?: CabinetChromeClassNames;
  isDark?: boolean;
  isV2?: boolean;
};

const ContractorFormsView = memo(function ContractorFormsView({
  styles,
  layoutStyles,
  cn,
  isDark = false,
  isV2: isV2Prop = false,
}: Props) {
  const portalIsV2 = usePortalDesign() === "v2";
  const isV2 = isV2Prop === true || portalIsV2;
  const emailNorm = useMemo(
    () => loadProfileSettings().email.trim().toLowerCase(),
    []
  );
  const theme = useMemo(() => buildCabinetAccentTheme(isDark, isV2), [isDark, isV2]);
  const forms = useContractorForms(emailNorm);

  const emailHint = (
    <p style={{ color: styles.text, fontSize: 14 }}>Укажите e-mail в настройках профиля.</p>
  );

  if (!emailNorm.includes("@")) {
    if (isV2) {
      return (
        <Page4V2PageContent
          title="Таблицы"
          lede={PAGE_LEDE}
          cn={cn}
          className="page4-v2__forms contractor-forms-v2"
        >
          {emailHint}
        </Page4V2PageContent>
      );
    }
    return <p style={{ padding: 16, color: styles.text, fontSize: 14 }}>Укажите e-mail в настройках профиля.</p>;
  }

  const body = (
    <>
      <ContractorFormsAlerts forms={forms} styles={styles} theme={theme} isDark={isDark} isV2={isV2} />
      <ContractorFormsTemplateList forms={forms} styles={styles} theme={theme} />
      <ContractorFormsEditor forms={forms} styles={styles} theme={theme} isDark={isDark} isV2={isV2} />
      <ContractorFormsToast forms={forms} styles={styles} theme={theme} isDark={isDark} />
    </>
  );

  if (isV2) {
    return (
      <Page4V2PageContent
        title="Таблицы"
        lede={PAGE_LEDE}
        cn={cn}
        className="page4-v2__forms contractor-forms-v2"
      >
        {body}
      </Page4V2PageContent>
    );
  }

  return (
    <div className={cx(css.root, cn?.recentPanel)} style={page4V2PanelStyle(layoutStyles, false)}>
      <div className={cx(css.title, cn?.recentTitle)} style={layoutStyles.recentTitle ?? {}}>
        Таблицы
      </div>
      <p className={css.lead} style={{ color: styles.muted }}>
        {PAGE_LEDE}
      </p>
      {body}
    </div>
  );
});

export default ContractorFormsView;
