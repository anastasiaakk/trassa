import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addMessengerHiddenForMe,
  clearMessengerHiddenForThread,
  loadHiddenForMeMap,
  removeMessengerHiddenIds,
} from "../utils/messengerHiddenForMe";
import {
  applyMessengerInvitePayload,
  ensureMessengerUidInProfile,
  parseMessengerInviteFromPastedText,
  buildMessengerInviteUrl,
  encodeMessengerInvite,
  getInvitePayloadFromProfile,
} from "../utils/messengerInvite";
import type { MessengerAttachment, MessengerMessage, MessengerPeer } from "../types/messenger";
import {
  MAX_MESSENGER_ATTACH_BYTES,
  persistMessengerMessages,
  persistMessengerPeers,
  readFileAsDataUrl,
  readMessengerStateFromStorage,
} from "../utils/messengerThreadStore";
import { computeInitialMessengerState, readInviteToastOnce } from "../utils/messengerInviteToast";
import type { MessengerInviteToast } from "../utils/messengerInviteToast";

const MAX_ATTACH_BYTES = MAX_MESSENGER_ATTACH_BYTES;

export function useMessengerState(cabinetPath?: string) {
  const initialMessengerRef = useRef<ReturnType<typeof computeInitialMessengerState> | null>(null);
  const getInitialMessenger = () => {
    if (!initialMessengerRef.current) initialMessengerRef.current = computeInitialMessengerState();
    return initialMessengerRef.current;
  };

  const [peers, setPeers] = useState(() => getInitialMessenger().peers);
  const [byThread, setByThread] = useState(() => getInitialMessenger().byThread);
  const [activeId, setActiveId] = useState(() => getInitialMessenger().activeId);
  const [inviteToast, setInviteToast] = useState<MessengerInviteToast | null>(() => readInviteToastOnce());
  const [inviteCopied, setInviteCopied] = useState(false);
  const [invitePasteField, setInvitePasteField] = useState("");
  const [invitePasteError, setInvitePasteError] = useState<string | null>(null);
  const [invitePasteApplied, setInvitePasteApplied] = useState(false);
  const [myAuthorId] = useState(() => ensureMessengerUidInProfile());
  const [draft, setDraft] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [peerSettingsOpen, setPeerSettingsOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<MessengerAttachment[]>([]);
  const [hiddenForMe, setHiddenForMe] = useState<Record<string, string[]>>(() => loadHiddenForMeMap());
  const [msgMenuId, setMsgMenuId] = useState<string | null>(null);
  const [forwardPickMsg, setForwardPickMsg] = useState<MessengerMessage | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  const inviteUrl = useMemo(() => {
    const path = cabinetPath ?? "/page5";
    const payload = getInvitePayloadFromProfile();
    return buildMessengerInviteUrl(path, encodeMessengerInvite(payload));
  }, [cabinetPath]);

  useEffect(() => {
    persistMessengerPeers(peers);
  }, [peers]);

  useEffect(() => {
    persistMessengerMessages(byThread);
    try {
      window.dispatchEvent(new CustomEvent("trassa-messenger-updated"));
    } catch {
      /* ignore */
    }
  }, [byThread]);

  const activePeer = useMemo(
    () => peers.find((peer) => peer.id === activeId) ?? peers[0],
    [activeId, peers],
  );

  const messages = useMemo(() => byThread[activeId] ?? [], [byThread, activeId]);

  const visibleMessages = useMemo(() => {
    const hide = new Set(hiddenForMe[activeId] ?? []);
    return messages.filter((message) => !hide.has(message.id));
  }, [messages, activeId, hiddenForMe]);

  const copyInviteLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2200);
    } catch {
      /* ignore */
    }
  }, [inviteUrl]);

  const applyPastedFriendInvite = useCallback(() => {
    setInvitePasteError(null);
    const payload = parseMessengerInviteFromPastedText(invitePasteField);
    if (!payload) {
      setInvitePasteError(
        "Не удалось распознать приглашение. Вставьте полную ссылку со страницы или фрагмент с messengerInvite=…",
      );
      return;
    }
    applyMessengerInvitePayload(payload);
    const next = readMessengerStateFromStorage();
    setPeers(next.peers);
    setByThread(next.byThread);
    setActiveId(next.activeId);
    const toast = readInviteToastOnce();
    if (toast) setInviteToast(toast);
    setInvitePasteField("");
    setInvitePasteApplied(true);
    window.setTimeout(() => setInvitePasteApplied(false), 2200);
  }, [invitePasteField]);

  const hideMessageForMe = useCallback((threadId: string, messageId: string) => {
    addMessengerHiddenForMe(threadId, messageId);
    setHiddenForMe(loadHiddenForMeMap());
    try {
      window.dispatchEvent(new CustomEvent("trassa-messenger-updated"));
    } catch {
      /* ignore */
    }
  }, []);

  const deleteMessageForEveryone = useCallback((threadId: string, messageId: string) => {
    setByThread((prev) => ({
      ...prev,
      [threadId]: (prev[threadId] ?? []).filter((message) => message.id !== messageId),
    }));
    removeMessengerHiddenIds(threadId, new Set([messageId]));
    setHiddenForMe(loadHiddenForMeMap());
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartRef.current = null;
  }, []);

  const onBubblePointerDown = useCallback(
    (e: React.PointerEvent, message: MessengerMessage) => {
      if (e.button !== 0) return;
      cancelLongPress();
      longPressStartRef.current = { x: e.clientX, y: e.clientY };
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        longPressStartRef.current = null;
        setMsgMenuId(message.id);
        try {
          navigator.vibrate?.(35);
        } catch {
          /* ignore */
        }
      }, 520);
    },
    [cancelLongPress],
  );

  const onBubblePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (longPressTimerRef.current == null || !longPressStartRef.current) return;
      const start = longPressStartRef.current;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (dx * dx + dy * dy > 100) cancelLongPress();
    },
    [cancelLongPress],
  );

  const onBubblePointerEnd = useCallback(() => {
    cancelLongPress();
  }, [cancelLongPress]);

  const copyMessageToClipboard = useCallback(async (message: MessengerMessage) => {
    const lines: string[] = [];
    if (message.text?.trim()) lines.push(message.text.trim());
    if (message.attachments?.length) {
      for (const attachment of message.attachments) {
        lines.push(
          attachment.kind === "image" ? `[Фото: ${attachment.name}]` : `[Файл: ${attachment.name}]`,
        );
      }
    }
    const str = lines.join("\n");
    try {
      await navigator.clipboard.writeText(str.length ? str : " ");
    } catch {
      /* ignore */
    }
    setMsgMenuId(null);
  }, []);

  const confirmForwardToPeer = useCallback(
    (message: MessengerMessage, targetThreadId: string) => {
      const textOut = message.text?.trim()
        ? `↪ ${message.text.trim()}`
        : message.attachments?.length
          ? "↪ [Вложение]"
          : "↪";
      const attachments = message.attachments?.map((attachment, index) => ({
        ...attachment,
        id: `fw-a-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      }));
      const newMsg: MessengerMessage = {
        id: `fw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        threadId: targetThreadId,
        author: myAuthorId,
        text: textOut,
        createdAt: new Date().toISOString(),
        attachments: attachments?.length ? attachments : undefined,
      };
      setByThread((prev) => ({
        ...prev,
        [targetThreadId]: [...(prev[targetThreadId] ?? []), newMsg],
      }));
      setForwardPickMsg(null);
      setMsgMenuId(null);
    },
    [myAuthorId],
  );

  useEffect(() => {
    if (msgMenuId == null) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-messenger-msg-menu-root]")) return;
      setMsgMenuId(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [msgMenuId]);

  useEffect(() => {
    if (msgMenuId == null && forwardPickMsg == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMsgMenuId(null);
        setForwardPickMsg(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [msgMenuId, forwardPickMsg]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, visibleMessages.length]);

  useEffect(() => {
    if (!peerSettingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPeerSettingsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [peerSettingsOpen]);

  useEffect(() => {
    if (!inviteToast) return;
    const id = window.setTimeout(() => setInviteToast(null), 6000);
    return () => window.clearTimeout(id);
  }, [inviteToast]);

  const addPeer = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    const role = newRole.trim() || "Участник";
    const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const peer: MessengerPeer = { id, name, role };
    setPeers((prev) => [...prev, peer]);
    setByThread((prev) => ({ ...prev, [id]: [] }));
    setNewName("");
    setNewRole("");
    setActiveId(id);
  }, [newName, newRole]);

  const removePeer = useCallback((id: string) => {
    clearMessengerHiddenForThread(id);
    setHiddenForMe(loadHiddenForMeMap());
    setPeers((prev) => {
      const next = prev.filter((peer) => peer.id !== id);
      setActiveId((curr) => {
        if (curr !== id) return curr;
        return next[0]?.id ?? "";
      });
      return next;
    });
    setByThread((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const onFilesSelected = useCallback(async (list: FileList | null) => {
    if (!list?.length) return;
    const next: MessengerAttachment[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      if (file.size > MAX_ATTACH_BYTES) continue;
      const attId = `a-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
      const isImg = file.type.startsWith("image/");
      if (isImg) {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          next.push({ id: attId, kind: "image", name: file.name, dataUrl });
        } catch {
          next.push({ id: attId, kind: "file", name: file.name });
        }
      } else {
        next.push({ id: attId, kind: "file", name: file.name });
      }
    }
    if (next.length) setPendingAttachments((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removePendingAttachment = useCallback((attId: string) => {
    setPendingAttachments((prev) => prev.filter((attachment) => attachment.id !== attId));
  }, []);

  const send = useCallback(() => {
    const text = draft.trim();
    const attachments = [...pendingAttachments];
    if ((!text && attachments.length === 0) || !activeId) return;
    const msg: MessengerMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      threadId: activeId,
      author: myAuthorId,
      text,
      createdAt: new Date().toISOString(),
      attachments: attachments.length ? attachments : undefined,
    };
    setByThread((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), msg],
    }));
    setDraft("");
    setPendingAttachments([]);
  }, [draft, activeId, pendingAttachments, myAuthorId]);

  const formatTime = useCallback((iso: string) => {
    try {
      return new Date(iso).toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, []);

  return {
    peers,
    byThread,
    activeId,
    setActiveId,
    inviteToast,
    inviteCopied,
    invitePasteField,
    setInvitePasteField,
    invitePasteError,
    setInvitePasteError,
    invitePasteApplied,
    myAuthorId,
    draft,
    setDraft,
    newName,
    setNewName,
    newRole,
    setNewRole,
    peerSettingsOpen,
    setPeerSettingsOpen,
    pendingAttachments,
    hiddenForMe,
    msgMenuId,
    setMsgMenuId,
    forwardPickMsg,
    setForwardPickMsg,
    fileInputRef,
    listEndRef,
    activePeer,
    messages,
    visibleMessages,
    copyInviteLink,
    applyPastedFriendInvite,
    hideMessageForMe,
    deleteMessageForEveryone,
    onBubblePointerDown,
    onBubblePointerMove,
    onBubblePointerEnd,
    copyMessageToClipboard,
    confirmForwardToPeer,
    addPeer,
    removePeer,
    onFilesSelected,
    removePendingAttachment,
    send,
    formatTime,
  };
}

export type MessengerState = ReturnType<typeof useMessengerState>;
