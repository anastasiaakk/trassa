import { lazy, type ComponentProps, type ReactNode, Suspense } from "react";
import AdminDevicesPanel from "./AdminDevicesPanel";
import AdminViolationsPanel from "./AdminViolationsPanel";
import type AdminAccountSection from "./AdminAccountSection";
import type AdminReleaseSection from "./AdminReleaseSection";
import type AdminUsersSection from "./AdminUsersSection";
import type AdminContractorsSection from "./AdminContractorsSection";
import type AdminMapSection from "./AdminMapSection";
import type AdminHomeSection from "./AdminHomeSection";
import type AdminSettingsSection from "./AdminSettingsSection";

const AdminAccountSectionLazy = lazy(() => import("./AdminAccountSection"));
const AdminReleaseSectionLazy = lazy(() => import("./AdminReleaseSection"));
const AdminUsersSectionLazy = lazy(() => import("./AdminUsersSection"));
const AdminContractorsSectionLazy = lazy(() => import("./AdminContractorsSection"));
const AdminMapSectionLazy = lazy(() => import("./AdminMapSection"));
const AdminHomeSectionLazy = lazy(() => import("./AdminHomeSection"));
const AdminSettingsSectionLazy = lazy(() => import("./AdminSettingsSection"));

const sectionFallback = <p style={{ padding: "0.75rem 0", opacity: 0.7 }}>Загрузка…</p>;

function LazySection({ children }: { children: ReactNode }) {
  return <Suspense fallback={sectionFallback}>{children}</Suspense>;
}

export type AdminPanelChromeProps = {
  sectionClass: string;
  titleClass: string;
  glassHintClass: string;
  errorClass: string;
  btnPrimaryClass: string;
  btnSecondaryClass: string;
};

const panelProps = (p: AdminPanelChromeProps) => ({
  glassHintClass: p.glassHintClass,
  errorClass: p.errorClass,
  btnPrimaryClass: p.btnPrimaryClass,
  btnSecondaryClass: p.btnSecondaryClass,
});

export function AdminDevicesSection(props: AdminPanelChromeProps) {
  return (
    <div className={props.sectionClass}>
      <h3 className={props.titleClass}>Выход с устройств</h3>
      <AdminDevicesPanel {...panelProps(props)} />
    </div>
  );
}

export function AdminViolationsSection(props: AdminPanelChromeProps) {
  return (
    <div className={props.sectionClass}>
      <h3 className={props.titleClass}>Нарушения</h3>
      <AdminViolationsPanel {...panelProps(props)} />
    </div>
  );
}

export function AdminAccountPanelSection() {
  return (
    <LazySection>
      <AdminAccountSectionLazy />
    </LazySection>
  );
}

export function AdminReleasePanelSection() {
  return (
    <LazySection>
      <AdminReleaseSectionLazy />
    </LazySection>
  );
}

export function AdminUsersPanelSection(
  props: ComponentProps<typeof AdminUsersSection>,
) {
  return (
    <LazySection>
      <AdminUsersSectionLazy {...props} />
    </LazySection>
  );
}

export function AdminContractorsPanelSection(
  props: ComponentProps<typeof AdminContractorsSection>,
) {
  return (
    <LazySection>
      <AdminContractorsSectionLazy {...props} />
    </LazySection>
  );
}

export function AdminMapPanelSection(props: ComponentProps<typeof AdminMapSection>) {
  return (
    <LazySection>
      <AdminMapSectionLazy {...props} />
    </LazySection>
  );
}

export function AdminHomePanelSection(props: ComponentProps<typeof AdminHomeSection>) {
  return (
    <LazySection>
      <AdminHomeSectionLazy {...props} />
    </LazySection>
  );
}

export function AdminSettingsPanelSection(props: ComponentProps<typeof AdminSettingsSection>) {
  return (
    <LazySection>
      <AdminSettingsSectionLazy {...props} />
    </LazySection>
  );
}
