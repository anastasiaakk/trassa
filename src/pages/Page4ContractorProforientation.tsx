import type { CabinetChromeContext } from "../components/CabinetChromeLayout";
import Page4V2PageContent from "../components/cabinet-v2/Page4V2PageContent";
import { ContractorTalentMatcherPanel, ProforientationResultsTable } from "../components/ProforientationEmployerPanels";

/** Контент страницы /page4/proforientation */
export function Page4ContractorProforientationMain({ ctx }: { ctx: CabinetChromeContext }) {
  const { styles, layoutStyles, profilePlaque, cn, isV2 } = ctx;
  const panels = (
    <>
      <ContractorTalentMatcherPanel
        styles={styles}
        layoutStyles={layoutStyles}
        cn={cn}
        isV2={isV2}
        contractorEmail={profilePlaque.email}
      />
      <ProforientationResultsTable styles={styles} layoutStyles={layoutStyles} cn={cn} isV2={isV2} />
    </>
  );
  if (isV2) {
    return (
      <Page4V2PageContent title="Профориентация" cn={cn} className="page4-v2__proforientation">
        {panels}
      </Page4V2PageContent>
    );
  }
  return (
    <section className={cn.section} style={layoutStyles.section}>
      {panels}
    </section>
  );
}
