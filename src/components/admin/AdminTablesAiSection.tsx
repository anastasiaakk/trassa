import { loadAiPromptLibrary, removeAiPrompt } from "../../utils/aiPromptsStorage";
import type { useAdminTablesPanel } from "../../hooks/useAdminTablesPanel";
import styles from "../../pages/AdminPanel.module.css";
import tables from "../../pages/AdminTablesPanel.module.css";

type Panel = ReturnType<typeof useAdminTablesPanel>;

type Props = {
  panel: Panel;
};

export default function AdminTablesAiSection({ panel }: Props) {
  const {
    aiReady,
    aiPrompt,
    setAiPrompt,
    aiBusy,
    handleAiRun,
    aiReply,
    handleAiExport,
    promptLib,
    setEditPromptId,
    setPromptTitle,
    setPromptBody,
    promptTitle,
    promptBody,
    savePrompt,
    editPromptId,
    setPromptLib,
  } = panel;

  return (
    <div className={tables.aiChat}>
      <div className={tables.editor}>
        <div className={aiReady ? tables.aiOk : tables.aiWarn}>
          {aiReady
            ? "Полноценный ИИ (OpenAI): анализ таблиц, распределение студентов, черновики шаблонов. Ответы деловые, без small talk."
            : "Подключите OPENAI_API_KEY на сервере и войдите в админку с включённым API."}
        </div>
        <textarea
          className={styles.input}
          rows={6}
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Пример: предложи столбцы для отчёта по летней практике; или: кто не сдал таблицы с просрочкой?"
        />
        <div className={styles.rowBtns}>
          <button
            type="button"
            className={styles.btnNeoPrimary}
            disabled={aiBusy}
            onClick={() => void handleAiRun()}
          >
            {aiBusy ? "Думаю…" : "Спросить ИИ"}
          </button>
          <button type="button" className={styles.btnNeoGhost} disabled={!aiReply} onClick={handleAiExport}>
            CSV
          </button>
        </div>
        {aiReply ? <div className={tables.aiReply}>{aiReply}</div> : null}
      </div>
      <div className={tables.editor}>
        <h4 className={styles.sectionTitle}>База промптов</h4>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
          {promptLib.prompts.map((p) => (
            <li key={p.id} style={{ marginBottom: 6 }}>
              <button
                type="button"
                className={styles.btnNeoGhost}
                style={{ width: "100%", textAlign: "left", fontSize: 12 }}
                onClick={() => {
                  setAiPrompt(p.body);
                  setEditPromptId(p.id);
                  setPromptTitle(p.title);
                  setPromptBody(p.body);
                }}
              >
                {p.title}
              </button>
            </li>
          ))}
        </ul>
        <label className={styles.label}>
          Название
          <input className={styles.input} value={promptTitle} onChange={(e) => setPromptTitle(e.target.value)} />
        </label>
        <label className={styles.label}>
          Текст
          <textarea
            className={styles.input}
            rows={4}
            value={promptBody}
            onChange={(e) => setPromptBody(e.target.value)}
          />
        </label>
        <div className={styles.rowBtns}>
          <button type="button" className={styles.btnNeoPrimary} onClick={savePrompt}>
            Сохранить
          </button>
          {editPromptId ? (
            <button
              type="button"
              className={styles.btnSmallDanger}
              onClick={() => {
                removeAiPrompt(editPromptId);
                setPromptLib(loadAiPromptLibrary());
                setEditPromptId(null);
              }}
            >
              Удалить
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
