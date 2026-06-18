import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fetchTbotStatus } from "../api/tbotApi";
import { getAssistantReply } from "../utils/aiAssistantReply";
import {
  buildMessengerNotifyText,
  collectAllIncomingMessageIds,
  dispatchTbotNotifyDot,
  findNewIncomingNotAnnounced,
  loadAnnouncedIdsFromSession,
  playMessengerIncomingSound,
  saveAnnouncedIdsToSession,
  TBOT_MSGR_ANNOUNCED_IDS_KEY,
  tryOsPushNotify,
} from "../utils/messengerTbotNotify";
import { hasMessengerInboxUnread } from "../utils/messengerUnread";
import {
  loadTBotAppearance,
  saveTBotAppearance,
  type TBotAppearance,
} from "../components/tbotAppearance";
import type { TBotMood } from "../components/TBotMascot";
import { CABINET_AI_CHAT_OPEN } from "../components/CabinetSoftToolbar";
import {
  BUBBLE,
  clamp,
  DRAG_THRESHOLD,
  lastAiMessageId,
  loadPanelPos,
  loadPos,
  MARGIN,
  PANEL_H,
  PANEL_W,
  savePanelPos,
  savePos,
  SCROLL_BOTTOM_THRESHOLD,
  TBOT_READ_AI_ID_KEY,
  type TbotMsg,
} from "../components/tbot/tbotConstants";

export function useTbotChat() {
  const [pos, setPos] = useState<{ left: number; top: number }>(() => {
    if (typeof window === "undefined") return { left: 100, top: 100 };
    const saved = loadPos();
    if (saved) {
      return {
        left: clamp(saved.left, MARGIN, window.innerWidth - BUBBLE - MARGIN),
        top: clamp(saved.top, MARGIN, window.innerHeight - BUBBLE - MARGIN),
      };
    }
    return {
      left: window.innerWidth - BUBBLE - MARGIN - 8,
      top: window.innerHeight - BUBBLE - MARGIN - 8,
    };
  });

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpenRequest = () => setOpen(true);
    window.addEventListener(CABINET_AI_CHAT_OPEN, onOpenRequest);
    return () => window.removeEventListener(CABINET_AI_CHAT_OPEN, onOpenRequest);
  }, []);

  useEffect(() => {
    if (!open || typeof window === "undefined" || window.innerWidth > 520) return;
    const panelW = Math.min(PANEL_W, window.innerWidth - 20);
    const panelH = Math.min(PANEL_H, window.innerHeight - 72);
    setPanelPos({
      left: Math.max(MARGIN, (window.innerWidth - panelW) / 2),
      top: Math.max(MARGIN + 36, (window.innerHeight - panelH) / 2),
    });
  }, [open]);

  const [dragging, setDragging] = useState(false);
  const now = Date.now();
  const [messages, setMessages] = useState<TbotMsg[]>([
    {
      id: "welcome",
      role: "ai",
      ts: now,
      text:
        "Привет! Я Т-бот — ИИ-помощник ТрассА. Подскажу по кабинету: мероприятия, мессенджер, таблицы, профиль, документы. Спросите «где найти…» или «как заполнить…» — отвечу по шагам.",
    },
  ]);
  const [tbotAiLabel, setTbotAiLabel] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [tbotMood, setTbotMood] = useState<TBotMood>("neutral");
  const [showJumpLatest, setShowJumpLatest] = useState(false);
  const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = loadPanelPos();
    if (!saved) return null;
    return {
      left: clamp(saved.left, MARGIN, window.innerWidth - PANEL_W - MARGIN),
      top: clamp(saved.top, MARGIN, window.innerHeight - PANEL_H - MARGIN),
    };
  });
  const [panelDragging, setPanelDragging] = useState(false);
  const [appearance, setAppearance] = useState<TBotAppearance>(() => loadTBotAppearance());
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [miniGameOpen, setMiniGameOpen] = useState(false);
  const [tipToast, setTipToast] = useState<{ title: string; text: string } | null>(null);
  const tipToastTimerRef = useRef<number | undefined>(undefined);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    void fetchTbotStatus().then((s) => {
      if (!s.ok) {
        setTbotAiLabel(null);
        return;
      }
      const label =
        s.providerLabel ??
        (s.provider === "gigachat"
          ? "GigaChat"
          : s.provider === "openrouter"
            ? "OpenRouter"
            : s.provider === "gemini"
              ? "Gemini"
              : s.provider === "deepseek"
                ? "DeepSeek"
                : "OpenAI");
      setTbotAiLabel(
        s.configured
          ? `${label} · ${s.model}`
          : "нужен OPENROUTER_API_KEY (openrouter.ai, бесплатно) или другой ключ на сервере"
      );
    });
  }, []);

  const patchAppearance = useCallback((patch: Partial<TBotAppearance>) => {
    setAppearance((prev) => {
      const next: TBotAppearance = { ...prev, ...patch };
      saveTBotAppearance(next);
      return next;
    });
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const moodTimersRef = useRef<number[]>([]);

  const clearMoodTimers = useCallback(() => {
    moodTimersRef.current.forEach((id) => window.clearTimeout(id));
    moodTimersRef.current = [];
  }, []);

  const scheduleMood = useCallback(
    (sequence: { mood: TBotMood; afterMs: number }[]) => {
      clearMoodTimers();
      let acc = 0;
      sequence.forEach(({ mood, afterMs }) => {
        acc += afterMs;
        const id = window.setTimeout(() => setTbotMood(mood), acc);
        moodTimersRef.current.push(id);
      });
    },
    [clearMoodTimers]
  );

  useEffect(() => {
    const onMessengerStoreUpdate = () => {
      try {
        if (!sessionStorage.getItem(TBOT_MSGR_ANNOUNCED_IDS_KEY)) {
          saveAnnouncedIdsToSession(collectAllIncomingMessageIds());
          return;
        }
        const announced = loadAnnouncedIdsFromSession();
        const fresh = findNewIncomingNotAnnounced(announced);
        if (fresh.length === 0) return;
        playMessengerIncomingSound();
        const text = buildMessengerNotifyText(fresh);
        tryOsPushNotify("Мессенджер", text);
        const next = new Set(announced);
        fresh.forEach((m) => next.add(m.id));
        saveAnnouncedIdsToSession(next);
        if (tipToastTimerRef.current) window.clearTimeout(tipToastTimerRef.current);
        setTipToast({ title: "Мессенджер", text });
        tipToastTimerRef.current = window.setTimeout(() => {
          setTipToast(null);
          tipToastTimerRef.current = undefined;
        }, 14000);
        setTbotMood("curious");
        scheduleMood([
          { mood: "happy", afterMs: 450 },
          { mood: "neutral", afterMs: 3000 },
        ]);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("trassa-messenger-updated", onMessengerStoreUpdate);
    queueMicrotask(() => {
      try {
        window.dispatchEvent(new CustomEvent("trassa-messenger-updated"));
      } catch {
        /* ignore */
      }
    });
    return () => window.removeEventListener("trassa-messenger-updated", onMessengerStoreUpdate);
  }, [scheduleMood]);

  useEffect(() => {
    if (!open) return;
    if (tipToastTimerRef.current) window.clearTimeout(tipToastTimerRef.current);
    tipToastTimerRef.current = undefined;
    setTipToast(null);
  }, [open]);

  useEffect(
    () => () => {
      if (tipToastTimerRef.current) window.clearTimeout(tipToastTimerRef.current);
    },
    []
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    listEndRef.current?.scrollIntoView({ behavior, block: "end" });
    stickToBottomRef.current = true;
    setShowJumpLatest(false);
  }, []);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const distFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distFromBottom < SCROLL_BOTTOM_THRESHOLD;
    stickToBottomRef.current = atBottom;
    setShowJumpLatest(!atBottom && scrollHeight > clientHeight + 40);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTbotMood("curious");
    const id = window.setTimeout(() => setTbotMood("neutral"), 2200);
    return () => window.clearTimeout(id);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    scrollToBottom("auto");
  }, [open, scrollToBottom]);

  useEffect(() => () => clearMoodTimers(), [clearMoodTimers]);

  useEffect(() => {
    if (!open) setMiniGameOpen(false);
  }, [open]);

  const displayMood: TBotMood = pending ? "thinking" : tbotMood;

  const [showAiUnreadDot, setShowAiUnreadDot] = useState(false);
  const [messengerUnread, setMessengerUnread] = useState(() =>
    typeof window !== "undefined" ? hasMessengerInboxUnread() : false
  );

  useEffect(() => {
    const syncMessengerUnread = () => {
      setMessengerUnread(hasMessengerInboxUnread());
    };
    window.addEventListener("trassa-messenger-updated", syncMessengerUnread);
    syncMessengerUnread();
    return () => window.removeEventListener("trassa-messenger-updated", syncMessengerUnread);
  }, []);

  const showNotifyDot = showAiUnreadDot || messengerUnread;

  useEffect(() => {
    dispatchTbotNotifyDot(showNotifyDot);
  }, [showNotifyDot]);

  useEffect(() => () => dispatchTbotNotifyDot(false), []);

  useEffect(() => {
    const lai = lastAiMessageId(messages);
    if (!lai) {
      setShowAiUnreadDot(false);
      return;
    }
    let readId: string | null = null;
    try {
      readId = localStorage.getItem(TBOT_READ_AI_ID_KEY);
    } catch {
      readId = null;
    }
    if (!readId) {
      try {
        localStorage.setItem(TBOT_READ_AI_ID_KEY, lai);
      } catch {
        /* ignore */
      }
      setShowAiUnreadDot(false);
      return;
    }
    if (open) {
      if (readId !== lai) {
        try {
          localStorage.setItem(TBOT_READ_AI_ID_KEY, lai);
        } catch {
          /* ignore */
        }
      }
      setShowAiUnreadDot(false);
    } else {
      setShowAiUnreadDot(lai !== readId);
    }
  }, [messages, open]);

  useLayoutEffect(() => {
    if (!open) return;
    if (stickToBottomRef.current) {
      listEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, [messages, pending, open]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => updateScrollState());
    return () => cancelAnimationFrame(id);
  }, [open, messages.length, pending, updateScrollState]);

  const dragRef = useRef({
    startX: 0,
    startY: 0,
    originLeft: 0,
    originTop: 0,
    moved: false,
  });

  const panelDragRef = useRef({
    startX: 0,
    startY: 0,
    originLeft: 0,
    originTop: 0,
  });

  const defaultPanelPos = useMemo(() => {
    const left = clamp(
      pos.left - PANEL_W + BUBBLE,
      MARGIN,
      typeof window !== "undefined" ? window.innerWidth - PANEL_W - MARGIN : 8
    );
    let top = pos.top - PANEL_H - MARGIN;
    if (typeof window !== "undefined") {
      if (top < MARGIN) {
        top = pos.top + BUBBLE + MARGIN;
      }
      if (top + PANEL_H > window.innerHeight - MARGIN) {
        top = clamp(window.innerHeight - PANEL_H - MARGIN, MARGIN, top);
      }
    }
    return { left, top };
  }, [pos.left, pos.top]);

  useEffect(() => {
    const onResize = () => {
      setPos((p) => ({
        left: clamp(p.left, MARGIN, window.innerWidth - BUBBLE - MARGIN),
        top: clamp(p.top, MARGIN, window.innerHeight - BUBBLE - MARGIN),
      }));
      setPanelPos((pp) => {
        if (!pp) return null;
        return {
          left: clamp(pp.left, MARGIN, window.innerWidth - PANEL_W - MARGIN),
          top: clamp(pp.top, MARGIN, window.innerHeight - PANEL_H - MARGIN),
        };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onBubblePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originLeft: pos.left,
        originTop: pos.top,
        moved: false,
      };
      setDragging(true);

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          dragRef.current.moved = true;
        }
        const left = clamp(
          dragRef.current.originLeft + dx,
          MARGIN,
          window.innerWidth - BUBBLE - MARGIN
        );
        const top = clamp(
          dragRef.current.originTop + dy,
          MARGIN,
          window.innerHeight - BUBBLE - MARGIN
        );
        setPos({ left, top });
      };

      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
        setDragging(false);
        setPos((current) => {
          savePos(current.left, current.top);
          return current;
        });
        if (!dragRef.current.moved) {
          setOpen((o) => !o);
        }
        dragRef.current.moved = false;
      };

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    },
    [pos.left, pos.top]
  );

  const onPanelHeaderPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      const el = e.currentTarget;
      const originLeft = panelPos?.left ?? defaultPanelPos.left;
      const originTop = panelPos?.top ?? defaultPanelPos.top;
      panelDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originLeft,
        originTop,
      };
      setPanelDragging(true);
      el.setPointerCapture(e.pointerId);

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - panelDragRef.current.startX;
        const dy = ev.clientY - panelDragRef.current.startY;
        const left = clamp(
          panelDragRef.current.originLeft + dx,
          MARGIN,
          window.innerWidth - PANEL_W - MARGIN
        );
        const top = clamp(
          panelDragRef.current.originTop + dy,
          MARGIN,
          window.innerHeight - PANEL_H - MARGIN
        );
        setPanelPos({ left, top });
      };

      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
        setPanelDragging(false);
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        setPanelPos((current) => {
          if (current) savePanelPos(current.left, current.top);
          return current;
        });
      };

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    },
    [panelPos, defaultPanelPos.left, defaultPanelPos.top]
  );

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || pending) return;
    const userMsg: TbotMsg = { id: `u-${Date.now()}`, role: "user", text, ts: Date.now() };
    const nextThread = [...messages, userMsg];
    setMessages(nextThread);
    stickToBottomRef.current = true;
    setDraft("");
    setPending(true);
    const typingDelay = 520 + Math.random() * 480;
    await new Promise((r) => window.setTimeout(r, typingDelay));
    try {
      const historyForModel = nextThread.map((m) => ({ role: m.role, text: m.text }));
      const replyText = await getAssistantReply(historyForModel);
      setMessages((prev) => [
        ...prev,
        { id: `ai-${Date.now()}`, role: "ai", text: replyText, ts: Date.now() },
      ]);
      setTbotMood("talking");
      scheduleMood([
        { mood: "happy", afterMs: 800 },
        { mood: "neutral", afterMs: 2600 },
      ]);
      if (!openRef.current) {
        playMessengerIncomingSound();
        tryOsPushNotify("Т-бот", "Готов ответ — откройте чат с ассистентом.");
        if (tipToastTimerRef.current) window.clearTimeout(tipToastTimerRef.current);
        const preview =
          replyText.length > 120 ? `${replyText.slice(0, 117).trimEnd()}…` : replyText;
        setTipToast({
          title: "Т-бот",
          text: `Ответ готов: ${preview}`,
        });
        tipToastTimerRef.current = window.setTimeout(() => {
          setTipToast(null);
          tipToastTimerRef.current = undefined;
        }, 14000);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          text: "Бип… не вышло связаться с моим процессором. Попробуйте ещё раз чуть позже.",
          ts: Date.now(),
        },
      ]);
      setTbotMood("worried");
      scheduleMood([{ mood: "neutral", afterMs: 2600 }]);
    } finally {
      setPending(false);
    }
  }, [draft, pending, messages, scheduleMood]);

  const panelLeft = panelPos?.left ?? defaultPanelPos.left;
  const panelTop = panelPos?.top ?? defaultPanelPos.top;

  return {
    pos,
    open,
    setOpen,
    dragging,
    messages,
    tbotAiLabel,
    draft,
    setDraft,
    pending,
    displayMood,
    showJumpLatest,
    panelDragging,
    appearance,
    customizeOpen,
    setCustomizeOpen,
    miniGameOpen,
    setMiniGameOpen,
    tipToast,
    setTipToast,
    tipToastTimerRef,
    patchAppearance,
    scrollRef,
    listEndRef,
    scrollToBottom,
    updateScrollState,
    onBubblePointerDown,
    onPanelHeaderPointerDown,
    send,
    panelLeft,
    panelTop,
    showNotifyDot,
  };
}
