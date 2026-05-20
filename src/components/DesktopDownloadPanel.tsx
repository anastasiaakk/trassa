import { memo, useEffect, useState } from "react";
import styles from "./DesktopDownloadPanel.module.css";
import {
  TRASSA_APP_UPDATE_LOCAL_URL,
  TRASSA_APP_UPDATE_MANIFEST_URL,
  TRASSA_SETUP_DOWNLOAD_URL,
  TRASSA_SETUP_LOCAL_URL,
} from "../config/desktopRelease";

type Props = {
  /** Узкая вёрстка внутри модального окна на /services */
  embedded?: boolean;
};

type UpdateManifest = {
  version?: string;
  releaseNotes?: string;
};

async function fetchManifest(url: string): Promise<UpdateManifest | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as UpdateManifest;
  } catch {
    return null;
  }
}

function DesktopDownloadPanel({ embedded }: Props) {
  const [version, setVersion] = useState<string | null>(null);
  const [checkBusy, setCheckBusy] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const manifest =
        (await fetchManifest(TRASSA_APP_UPDATE_LOCAL_URL)) ||
        (await fetchManifest(TRASSA_APP_UPDATE_MANIFEST_URL));
      if (!cancelled && manifest?.version) {
        setVersion(manifest.version);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={embedded ? styles.embedded : styles.standalone}>
      <h2 className={styles.title} id="about-dialog-download-heading">
        Приложение для компьютера (Windows)
      </h2>
      <p className={styles.lead}>
        Установщик с автообновлением: после установки приложение «Трасса» само проверяет новые версии и
        предложит обновиться. Сейчас на сайте и в браузере портал работает как обычно; отдельное окно на
        рабочем столе — по желанию.
      </p>
      <ul className={styles.featureList}>
        <li>Установка в пару кликов (мастер установки)</li>
        <li>Уведомление, когда выходит новая версия</li>
        <li>Тот же интерфейс, что в браузере</li>
      </ul>
      <div className={styles.downloadBlock}>
        <a
          className={styles.downloadBtn}
          href={TRASSA_SETUP_DOWNLOAD_URL}
          download="trassa-setup.exe"
          rel="noopener noreferrer"
        >
          Скачать «Трасса» для Windows
        </a>
        <p className={styles.downloadHint}>
          {version ? `Актуальная версия: ${version}. ` : ""}
          Файл: <strong>trassa-setup.exe</strong> (установщик с автообновлением)
        </p>
        <button
          type="button"
          className={styles.checkBtn}
          disabled={checkBusy}
          onClick={() => {
            if (!window.trassaDesktop?.checkForUpdatesNow) {
              setCheckMsg("Кнопка доступна только в установленном desktop-приложении.");
              return;
            }
            setCheckBusy(true);
            setCheckMsg(null);
            void window.trassaDesktop.checkForUpdatesNow().then((r) => {
              setCheckBusy(false);
              if (r.ok) {
                setCheckMsg("Проверка обновлений запущена.");
              } else {
                setCheckMsg(r.error || "Не удалось запустить проверку обновлений.");
              }
            });
          }}
        >
          {checkBusy ? "Проверка..." : "Проверить обновления сейчас"}
        </button>
        {checkMsg ? <p className={styles.checkHint}>{checkMsg}</p> : null}
        <p className={styles.downloadMirror}>
          Если ссылка не открывается,{" "}
          <a className={styles.mirrorLink} href={TRASSA_SETUP_LOCAL_URL} download="trassa-setup.exe">
            скачать копию с этого сайта
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default memo(DesktopDownloadPanel);
