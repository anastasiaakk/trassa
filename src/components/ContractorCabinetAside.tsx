import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import CabinetHomeIcon from "./CabinetHomeIcon";
import { cx, type CabinetChromeClassNames } from "../design-system/cabinetChromeClasses";
import type { CabinetChromeStyles } from "./CabinetChromeLayout";

type LayoutStyles = Record<string, CSSProperties>;

type Props = {
  styles: CabinetChromeStyles;
  layoutStyles: LayoutStyles;
  cn?: CabinetChromeClassNames;
  isDark: boolean;
  /** Текущий раздел кабинета подрядчика */
  active: "home" | "proforientation" | "documents" | "teams" | "recommendations" | "forms";
  /** Новые рекомендации студентов от администратора */
  recommendationsUnread?: number;
  /** Непрочитанные уведомления по таблицам */
  formsUnread?: number;
};

/** Левая колонка: «Главная» и плашка профориентации (отдельная страница). */
export function ContractorCabinetAside({
  styles,
  layoutStyles,
  cn,
  isDark,
  active,
  recommendationsUnread = 0,
  formsUnread = 0,
}: Props) {
  const navigate = useNavigate();

  const navPlaque = (selected: boolean) => ({
    background: selected
      ? `${styles.plaqueNavActiveBg} padding-box, ${styles.plaqueNavActiveBorder} border-box`
      : `${styles.plaqueAccentStripe}, ${styles.plaqueButtonBg}`,
    color: selected ? styles.plaqueNavActiveText : styles.plaqueButtonText,
    boxShadow: selected ? styles.plaqueButtonShadow : `${styles.plaqueButtonShadow}, ${styles.plaqueAccentGlow}`,
  });

  // Одинаковая толщина рамки в обоих состояниях, чтобы плашки не "прыгали".
  const navOuterBorder = "2px solid transparent";

  // В активной плашке всегда используем контрастный текст.
  const navMuted = (selected: boolean) =>
    selected
      ? isDark
        ? "rgba(248, 250, 252, 0.9)"
        : "rgba(248, 250, 252, 0.92)"
      : styles.plaqueButtonMuted;

  return (
    <aside className={cn?.aside} style={layoutStyles.aside}>
      <button
        type="button"
        className={cx("softtouch-plaque", active === "home" && cn?.navActive)}
        onClick={() => navigate("/page4")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "18px 20px",
          borderRadius: 30,
          width: "100%",
          boxSizing: "border-box",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          fontWeight: 700,
          ...navPlaque(active === "home"),
          border: navOuterBorder,
        }}
      >
        <CabinetHomeIcon
          size={22}
          color={active === "home" ? styles.plaqueNavActiveText : styles.plaqueButtonText}
        />
        <span style={{ flex: 1, minWidth: 0 }}>Главная</span>
        <span
          style={{
            marginLeft: "auto",
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            minWidth: 44,
          }}
          aria-hidden={active !== "home"}
        >
          <span
            style={{
              background: styles.plaqueBadgeBg,
              color: styles.plaqueBadgeText,
              fontWeight: 700,
              borderRadius: 9999,
              padding: "6px 14px",
              fontSize: 12,
              opacity: active === "home" ? 1 : 0,
            }}
          >
            2
          </span>
        </span>
      </button>

      <button
        type="button"
        className={cx("softtouch-plaque", active === "recommendations" && cn?.navActive)}
        onClick={() => navigate("/page4/recommendations")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "18px 20px",
          borderRadius: 30,
          width: "100%",
          boxSizing: "border-box",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          ...navPlaque(active === "recommendations"),
          border: navOuterBorder,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: navMuted(active === "recommendations"),
              marginBottom: 7,
            }}
          >
            ПОДБОРКА
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              lineHeight: 1.25,
              color:
                active === "recommendations" ? styles.plaqueNavActiveText : styles.plaqueButtonText,
            }}
          >
            Студенты
          </div>
          <div
            style={{
              fontSize: 12,
              color: navMuted(active === "recommendations"),
              marginTop: 7,
              lineHeight: 1.35,
            }}
          >
            Рекомендованные кадры в вашей спецификации
          </div>
        </div>
        <span
          style={{
            marginLeft: "auto",
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            minWidth: 44,
          }}
          aria-hidden={recommendationsUnread <= 0}
        >
          <span
            style={{
              background: recommendationsUnread > 0 ? "#c62828" : styles.plaqueBadgeBg,
              color: recommendationsUnread > 0 ? "#fff" : styles.plaqueBadgeText,
              fontWeight: 700,
              borderRadius: 9999,
              padding: "6px 12px",
              fontSize: 12,
              opacity: recommendationsUnread > 0 ? 1 : 0,
            }}
          >
            {recommendationsUnread > 99 ? "99+" : recommendationsUnread}
          </span>
        </span>
      </button>

      <button
        type="button"
        className={cx("softtouch-plaque", active === "forms" && cn?.navActive)}
        onClick={() => navigate("/page4/forms")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "18px 20px",
          borderRadius: 30,
          width: "100%",
          boxSizing: "border-box",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          ...navPlaque(active === "forms"),
          border: navOuterBorder,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: navMuted(active === "forms"),
              marginBottom: 7,
            }}
          >
            ТАБЛИЦЫ
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              lineHeight: 1.25,
              color: active === "forms" ? styles.plaqueNavActiveText : styles.plaqueButtonText,
            }}
          >
            Заполнение таблиц
          </div>
          <div
            style={{
              fontSize: 12,
              color: navMuted(active === "forms"),
              marginTop: 7,
              lineHeight: 1.35,
            }}
          >
            Шаблоны от администратора
          </div>
        </div>
        <span
          style={{
            marginLeft: "auto",
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            minWidth: 44,
          }}
          aria-hidden={formsUnread <= 0}
        >
          <span
            style={{
              background: styles.plaqueBadgeBg,
              color: styles.plaqueBadgeText,
              fontWeight: 700,
              borderRadius: 9999,
              padding: "6px 12px",
              fontSize: 12,
              opacity: formsUnread > 0 ? 1 : 0,
            }}
          >
            {formsUnread > 99 ? "99+" : formsUnread}
          </span>
        </span>
      </button>

      <button
        type="button"
        className={cx("softtouch-plaque", active === "teams" && cn?.navActive)}
        onClick={() => navigate("/page4/teams")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "18px 20px",
          borderRadius: 30,
          width: "100%",
          boxSizing: "border-box",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          ...navPlaque(active === "teams"),
          border: navOuterBorder,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: navMuted(active === "teams"),
              marginBottom: 7,
            }}
          >
            КОМАНДЫ
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              lineHeight: 1.25,
              color: active === "teams" ? styles.plaqueNavActiveText : styles.plaqueButtonText,
            }}
          >
            Студенческие дорожные команды
          </div>
          <div
            style={{
              fontSize: 12,
              color: navMuted(active === "teams"),
              marginTop: 7,
              lineHeight: 1.35,
            }}
          >
            Материалы ассоциаций РАДОР и АДО
          </div>
        </div>
        <span
          style={{
            fontSize: 18,
            color: active === "teams" ? styles.plaqueNavActiveText : styles.plaqueButtonText,
            flexShrink: 0,
          }}
          aria-hidden
        >
          →
        </span>
      </button>

      <button
        type="button"
        className={cx("softtouch-plaque", active === "documents" && cn?.navActive)}
        onClick={() => navigate("/page4/documents")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "18px 20px",
          borderRadius: 30,
          width: "100%",
          boxSizing: "border-box",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          ...navPlaque(active === "documents"),
          border: navOuterBorder,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: navMuted(active === "documents"),
              marginBottom: 7,
            }}
          >
            ДОКУМЕНТЫ
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              lineHeight: 1.25,
              color: active === "documents" ? styles.plaqueNavActiveText : styles.plaqueButtonText,
            }}
          >
            Шаблоны ассоциаций
          </div>
          <div
            style={{
              fontSize: 12,
              color: navMuted(active === "documents"),
              marginTop: 7,
              lineHeight: 1.35,
            }}
          >
            Заполнить и отправить ответ
          </div>
        </div>
        <span
          style={{
            fontSize: 18,
            color: active === "documents" ? styles.plaqueNavActiveText : styles.plaqueButtonText,
            flexShrink: 0,
          }}
          aria-hidden
        >
          →
        </span>
      </button>

      <button
        type="button"
        className={cx("softtouch-plaque", active === "proforientation" && cn?.navActive)}
        onClick={() => navigate("/page4/proforientation")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "18px 20px",
          borderRadius: 30,
          width: "100%",
          boxSizing: "border-box",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          ...navPlaque(active === "proforientation"),
          border: navOuterBorder,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: navMuted(active === "proforientation"),
              marginBottom: 7,
            }}
          >
            ПРОФОРИЕНТАЦИЯ
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              lineHeight: 1.25,
              color: active === "proforientation" ? styles.plaqueNavActiveText : styles.plaqueButtonText,
            }}
          >
            Результаты теста и подбор кадров
          </div>
          <div
            style={{
              fontSize: 12,
              color: navMuted(active === "proforientation"),
              marginTop: 7,
              lineHeight: 1.35,
            }}
          >
            Школьники и студенты — открыть отчёт
          </div>
        </div>
        <span
          style={{
            fontSize: 18,
            color: active === "proforientation" ? styles.plaqueNavActiveText : styles.plaqueButtonText,
            flexShrink: 0,
          }}
          aria-hidden
        >
          →
        </span>
      </button>

    </aside>
  );
}
