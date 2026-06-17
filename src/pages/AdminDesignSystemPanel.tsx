import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CabinetKpiCard from "../components/CabinetKpiCard";
import GlassCard from "../components/admin/GlassCard";
import { adminDesignSystemAiChat } from "../api/adminDesignApi";
import { getAdminApiToken } from "../api/adminApi";
import { PORTAL_KV } from "../config/portalKeys";
import { setPortalDesign } from "../design-system/portalDesign";
import {
  DEFAULT_PORTAL_DESIGN_TOKENS,
  getDesignTokens,
  mergeDesignTokenPatch,
  parseDesignAiPayload,
  PORTAL_DESIGN_TOKENS_CHANGED,
  readStoredDesignTokens,
  resetDesignTokens,
  setDesignTokens,
  type PortalDesignTokensV1,
} from "../design-system/portalDesignTokens";
import { usePortalDesign } from "../design-system/usePortalDesign";
import { isAuthApiEnabled } from "../utils/authMode";
import { pushPortalKvWithAck } from "../utils/portalSync";
import styles from "./AdminPanel.module.css";
import glass from "./AdminPanelGlass.module.css";
import ds from "./AdminDesignSystemPanel.module.css";
import { cx } from "../design-system/cabinetChromeClasses";

type Props = {
  glassTone?: "dark" | "map";
};

type ChatMsg = { role: "user" | "assistant"; content: string };

const PALETTE_LABELS: Record<keyof PortalDesignTokensV1["palette"], string> = {
  primary: "Primary — акцент, CTA",
  white: "White — фон",
  ink: "Ink — текст",
  surface: "Surface — редко (F6F6F6)",
  muted: "Muted — подписи",
};

export default function AdminDesignSystemPanel({ glassTone = "dark" }: Props) {
  const portalDesign = usePortalDesign();
  const aiReady = isAuthApiEnabled() && Boolean(getAdminApiToken());

  const [tokens, setTokens] = useState<PortalDesignTokensV1>(() => getDesignTokens());
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiChat, setAiChat] = useState<ChatMsg[]>([]);
  const [aiErr, setAiErr] = useState<string | null>(null);

  const applyDraft = useCallback((next: PortalDesignTokensV1) => {
    setTokens(next);
    setDesignTokens(next);
  }, []);

  useEffect(() => {
    if (portalDesign !== "v2") {
      setPortalDesign("v2");
    }
  }, [portalDesign]);

  useEffect(() => {
    const sync = () => {
      const stored = readStoredDesignTokens();
      if (stored) setTokens(stored);
    };
    window.addEventListener(PORTAL_DESIGN_TOKENS_CHANGED, sync);
    return () => window.removeEventListener(PORTAL_DESIGN_TOKENS_CHANGED, sync);
  }, []);

  const updatePalette = (key: keyof PortalDesignTokensV1["palette"], value: string) => {
    applyDraft({
      ...tokens,
      palette: { ...tokens.palette, [key]: value },
    });
  };

  const updateRadius = (key: "sm" | "md" | "lg", value: string) => {
    applyDraft({
      ...tokens,
      radius: { ...tokens.radius, [key]: value },
    });
  };

  const handleSave = async () => {
    setBusy(true);
    setSaveMsg(null);
    setSaveErr(null);
    setDesignTokens(tokens);
    if (isAuthApiEnabled() && getAdminApiToken()) {
      const res = await pushPortalKvWithAck(PORTAL_KV.DESIGN_TOKENS, tokens);
      setBusy(false);
      if (res.ok) {
        setSaveMsg("Сохранено на сервере. Изменения появятся у всех клиентов за ~3 с.");
      } else {
        setSaveErr(res.error ?? "Не удалось сохранить на сервер.");
      }
    } else {
      setBusy(false);
      setSaveMsg("Сохранено локально в этом браузере. Для синхронизации включите API и войдите в админку.");
    }
  };

  const handleReset = async () => {
    setBusy(true);
    setSaveMsg(null);
    setSaveErr(null);
    const defaults = resetDesignTokens();
    setTokens(defaults);
    if (isAuthApiEnabled() && getAdminApiToken()) {
      const res = await pushPortalKvWithAck(PORTAL_KV.DESIGN_TOKENS, defaults);
      setBusy(false);
      setSaveMsg(res.ok ? "Сброшено к значениям по умолчанию." : "Локально сброшено.");
      if (!res.ok) setSaveErr(res.error ?? "");
    } else {
      setBusy(false);
      setSaveMsg("Сброшено локально.");
    }
  };

  const handleAiSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = aiInput.trim();
    if (!text || aiBusy) return;

    const userMsg: ChatMsg = { role: "user", content: text };
    const nextChat = [...aiChat, userMsg];
    setAiChat(nextChat);
    setAiInput("");
    setAiErr(null);

    if (!aiReady) {
      setAiErr("ИИ доступен при включённом API и входе администратора (OPENAI_API_KEY на сервере).");
      return;
    }

    setAiBusy(true);
    const res = await adminDesignSystemAiChat({
      messages: nextChat.map((m) => ({ role: m.role, content: m.content })),
      currentTokens: tokens,
    });
    setAiBusy(false);

    if (!res.ok) {
      setAiErr(res.error);
      return;
    }

    const parsed = parseDesignAiPayload(res.reply);
    if (parsed) {
      setAiChat((c) => [...c, { role: "assistant", content: parsed.reply }]);
      if (parsed.patch && Object.keys(parsed.patch).length > 0) {
        applyDraft(mergeDesignTokenPatch(tokens, parsed.patch));
      }
    } else {
      setAiChat((c) => [...c, { role: "assistant", content: res.reply }]);
      setAiErr("ИИ ответил без JSON-patch. Повторите запрос точнее, например: «сделай primary темнее».");
    }
  };

  return (
    <div className={ds.root}>
      <p className={ds.intro}>
        Дизайн-система v2 по референсам MediAid / Rentier / E-Commerce. Меняйте токены — превью обновляется сразу.
        «Сохранить» записывает на сервер для всех устройств. ИИ меняет палитру и радиусы по вашему тексту.
        Полное превью: <Link to="/design-preview">/design-preview</Link>
      </p>

      <div className={ds.grid}>
        <GlassCard tone={glassTone}>
          <div className={ds.panel}>
            <h3 className={ds.groupTitle}>Палитра (5 цветов)</h3>
            {(Object.keys(PALETTE_LABELS) as Array<keyof PortalDesignTokensV1["palette"]>).map((key) => (
              <div key={key} className={ds.field}>
                <label htmlFor={`ds-color-${key}`}>{PALETTE_LABELS[key]}</label>
                <div className={ds.fieldRow}>
                  <input
                    id={`ds-color-${key}`}
                    type="color"
                    className={ds.colorInput}
                    value={tokens.palette[key].startsWith("#") ? tokens.palette[key] : "#2B64FD"}
                    onChange={(ev) => updatePalette(key, ev.target.value.toUpperCase())}
                  />
                  <input
                    type="text"
                    className={ds.textInput}
                    value={tokens.palette[key]}
                    onChange={(ev) => updatePalette(key, ev.target.value)}
                    spellCheck={false}
                  />
                </div>
              </div>
            ))}

            <h3 className={ds.groupTitle}>Скругления</h3>
            {(["sm", "md", "lg"] as const).map((key) => (
              <div key={key} className={ds.field}>
                <label htmlFor={`ds-radius-${key}`}>radius.{key}</label>
                <input
                  id={`ds-radius-${key}`}
                  type="text"
                  className={ds.textInput}
                  value={tokens.radius?.[key] ?? DEFAULT_PORTAL_DESIGN_TOKENS.radius?.[key] ?? ""}
                  onChange={(ev) => updateRadius(key, ev.target.value)}
                />
              </div>
            ))}

            <div className={ds.actions}>
              <button type="button" className={styles.btnNeoPrimary} disabled={busy} onClick={() => void handleSave()}>
                {busy ? "…" : "Сохранить"}
              </button>
              <button type="button" className={styles.btnNeoGhost} disabled={busy} onClick={() => void handleReset()}>
                Сбросить
              </button>
            </div>
            {saveMsg ? <p className={ds.msgOk}>{saveMsg}</p> : null}
            {saveErr ? <p className={ds.msgErr}>{saveErr}</p> : null}
          </div>
        </GlassCard>

        <div className={ds.previewWrap}>
          <h3 className={ds.previewTitle}>Превью (живые токены)</h3>
          <div className={ds.previewScene} data-portal-design="v2">
            <div className={ds.previewRow}>
              <CabinetKpiCard label="Регионов" value="67" />
              <CabinetKpiCard label="Подрядчиков" value="704" accent="cyan" />
            </div>
            <div className={ds.previewBtns}>
              <button type="button" className={cx("pv2-btn", "pv2-btn-primary")}>
                Primary
              </button>
              <button type="button" className={cx("pv2-btn", "pv2-btn-ghost")}>
                Ghost
              </button>
              <span className="pv2-table__pill">Chip</span>
            </div>
          </div>
        </div>
      </div>

      <GlassCard tone={glassTone}>
        <div className={ds.aiBlock}>
          <h3 className={ds.groupTitle}>ИИ-редактор дизайн-системы</h3>
          <p className={ds.intro} style={{ margin: 0 }}>
            Примеры: «сделай primary чуть темнее», «увеличь скругление карточек до 20px», «верни палитру по умолчанию».
            {!aiReady ? " (нужен API + токен админа + OPENAI_API_KEY)" : ""}
          </p>
          {aiChat.length > 0 ? (
            <div className={ds.aiHistory}>
              {aiChat.map((m, i) => (
                <p
                  key={`${m.role}-${i}`}
                  className={cx(ds.aiMsg, m.role === "user" ? ds.aiMsgUser : ds.aiMsgBot)}
                >
                  <strong>{m.role === "user" ? "Вы" : "ИИ"}:</strong> {m.content}
                </p>
              ))}
            </div>
          ) : null}
          <form onSubmit={(e) => void handleAiSubmit(e)}>
            <textarea
              className={glass.glassTextarea}
              rows={3}
              value={aiInput}
              onChange={(ev) => setAiInput(ev.target.value)}
              placeholder="Опишите, что изменить в дизайне…"
              disabled={aiBusy}
            />
            <div className={ds.actions} style={{ marginTop: 10 }}>
              <button type="submit" className={styles.btnNeoPrimary} disabled={aiBusy || !aiInput.trim()}>
                {aiBusy ? "ИИ думает…" : "Применить через ИИ"}
              </button>
            </div>
          </form>
          {aiErr ? <p className={ds.msgErr}>{aiErr}</p> : null}
        </div>
      </GlassCard>
    </div>
  );
}
