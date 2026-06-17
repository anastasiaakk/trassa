import { type FormEvent, useCallback, useEffect, useState } from "react";
import { fetchAppUpdateManifest, publishAppUpdate } from "../../api/appUpdateApi";
import { APP_VERSION } from "../../config/appVersion";
import { TRASSA_SETUP_DOWNLOAD_URL } from "../../config/desktopRelease";
import { isAuthApiEnabled } from "../../utils/authMode";
import { isPortalSyncEnabled } from "../../utils/portalSync";
import styles from "../../pages/AdminPanel.module.css";
import glass from "../../pages/AdminPanelGlass.module.css";

export default function AdminReleaseSection() {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(APP_VERSION);
  const [setupUrl, setSetupUrl] = useState(TRASSA_SETUP_DOWNLOAD_URL);
  const [releaseNotes, setReleaseNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedVersion, setPublishedVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthApiEnabled() || !isPortalSyncEnabled()) return;
    void fetchAppUpdateManifest().then((res) => {
      if (!res.ok) return;
      setPublishedVersion(res.manifest.version);
      setVersion(res.manifest.version);
      setSetupUrl(res.manifest.setupUrl);
      setReleaseNotes(res.manifest.releaseNotes ?? "");
    });
  }, []);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setPublishing(true);
      setFeedback(null);
      const res = await publishAppUpdate({
        version: version.trim(),
        setupUrl: setupUrl.trim(),
        releaseNotes: releaseNotes.trim(),
      });
      setPublishing(false);
      if (res.ok) {
        setPublishedVersion(res.manifest.version);
        setFeedback(
          `Версия ${res.manifest.version} опубликована. Пользователи увидят предложение обновиться при следующей проверке.`,
        );
      } else {
        setFeedback(res.error);
      }
    },
    [version, setupUrl, releaseNotes],
  );

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.collapseTrigger}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={`${styles.collapseChevron} ${open ? styles.collapseChevronOpen : ""}`}
          aria-hidden
        >
          ▶
        </span>
        <h3 className={`${styles.sectionTitle} ${styles.collapseTitle}`}>
          Обновление приложения (.exe)
        </h3>
        <span className={styles.collapseMeta}>
          {publishedVersion ? `опубликована v${publishedVersion}` : "не опубликовано"}
        </span>
      </button>

      {open ? (
        <div className={styles.collapseBody}>
          <p className={styles.subtitle} style={{ marginBottom: 12 }}>
            <strong>Данные портала</strong> (карта, документы, календарь) у пользователей
            обновляются сами каждые ~25 секунд.
            <br />
            <strong>Новая версия программы</strong>: соберите установщик, загрузите на GitHub
            (или другой https), укажите версию и ссылку ниже и нажмите «Опубликовать». Программы
            проверяют обновление раз в сутки и при возврате в окно.
          </p>

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.label}>
              Версия (должна быть выше установленной у пользователей)
              <input
                className={styles.input}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="0.2.1"
                required
              />
            </label>
            <label className={styles.label}>
              Ссылка на установщик (https)
              <input
                className={styles.input}
                value={setupUrl}
                onChange={(e) => setSetupUrl(e.target.value)}
                required
              />
            </label>
            <label className={styles.label}>
              Что нового (необязательно)
              <textarea
                className={styles.input}
                rows={3}
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
              />
            </label>
            <button type="submit" className={styles.btnNeoPrimary} disabled={publishing}>
              {publishing ? "Публикация…" : "Опубликовать обновление"}
            </button>
          </form>

          {feedback ? <p className={glass.glassMsg}>{feedback}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
