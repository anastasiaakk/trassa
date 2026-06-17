export type FormAlertKind =
  | "contractor_assigned"
  | "contractor_deadline_soon"
  | "contractor_deadline_due"
  | "rador_snapshot";

export type FormAlert = {
  id: string;
  audience: "contractor" | "rador";
  /** Для подрядчика */
  emailNorm?: string;
  templateId: string;
  templateTitle: string;
  kind: FormAlertKind;
  message: string;
  createdAt: string;
  read: boolean;
  dueAt?: string | null;
  snapshotId?: string;
};

export type FormAlertsStore = {
  version: 1;
  alerts: FormAlert[];
};
