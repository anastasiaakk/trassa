export type MessengerPeer = {
  id: string;
  name: string;
  role: string;
};

export type MessengerAttachment = {
  id: string;
  kind: "image" | "file";
  name: string;
  dataUrl?: string;
};

export type MessengerMessage = {
  id: string;
  threadId: string;
  /** messengerUid отправителя (или id демо-собеседника) */
  author: string;
  text: string;
  createdAt: string;
  attachments?: MessengerAttachment[];
};

export type MessengerInviteToast = { mode: "added" | "exists"; name: string };
