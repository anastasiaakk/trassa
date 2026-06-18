import type { ComponentProps, ReactNode } from "react";
import AdminDevicesPanel from "./AdminDevicesPanel";
import AdminViolationsPanel from "./AdminViolationsPanel";
import AdminAccountSection from "./AdminAccountSection";
import AdminReleaseSection from "./AdminReleaseSection";
import AdminUsersSection from "./AdminUsersSection";
import AdminContractorsSection from "./AdminContractorsSection";
import AdminMapSection from "./AdminMapSection";
import AdminHomeSection from "./AdminHomeSection";
import AdminSettingsSection from "./AdminSettingsSection";

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
  return <AdminAccountSection />;
}

export function AdminReleasePanelSection() {
  return <AdminReleaseSection />;
}

export function AdminUsersPanelSection(props: ComponentProps<typeof AdminUsersSection>) {
  return <AdminUsersSection {...props} />;
}

export function AdminContractorsPanelSection(props: ComponentProps<typeof AdminContractorsSection>) {
  return <AdminContractorsSection {...props} />;
}

export function AdminMapPanelSection(props: ComponentProps<typeof AdminMapSection>) {
  return <AdminMapSection {...props} />;
}

export function AdminHomePanelSection(props: ComponentProps<typeof AdminHomeSection>) {
  return <AdminHomeSection {...props} />;
}

export function AdminSettingsPanelSection(props: ComponentProps<typeof AdminSettingsSection>) {
  return <AdminSettingsSection {...props} />;
}
