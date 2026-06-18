import { memo, useCallback, type KeyboardEvent, type MouseEvent } from "react";
import {
  ROLE_EXPAND_BG,
  ROLE_FEATURE_COPY,
  ROLE_HOVER_OVERLAY_SRC,
  type RoleSelectRoleIcon,
} from "../../config/roleSelectRoles";
import { cx } from "../../design-system/cabinetChromeClasses";
import styles from "../../pages/RoleSelectPage.module.css";

export type RoleSelectRoleCardProps = {
  icon: RoleSelectRoleIcon;
  index: number;
  isSelected: boolean;
  isV2?: boolean;
  onSelect: (index: number) => void;
  onLeave?: () => void;
};

const RoleSelectRoleCard = memo(
  ({ icon, index, isSelected, isV2 = false, onSelect, onLeave }: RoleSelectRoleCardProps) => {
    const hoverOverlaySrc = ROLE_HOVER_OVERLAY_SRC[index];
    const expandBg = ROLE_EXPAND_BG[index];
    const featureCopy = ROLE_FEATURE_COPY[index];
    const isExpanded = isSelected;
    const expandPanelStyle = {
      ["--institutions-hover-overlay" as string]: `url(${hoverOverlaySrc})`,
      ["--institutions-bg-position" as string]: expandBg.position,
      ["--institutions-bg-scale" as string]: expandBg.scale,
    };

    const handleDivClick = useCallback(() => onSelect(index), [index, onSelect]);

    const handleDivKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(index);
        }
      },
      [index, onSelect]
    );

    const handleButtonClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onSelect(index);
      },
      [index, onSelect]
    );

    return (
      <div
        className={cx(
          styles.roleCard,
          isSelected && styles.roleCardSelected,
          styles.roleCardInstitutions,
          isExpanded && styles.roleCardInstitutionsExpanded,
          isV2 && "role-select-v2__role-card",
          isV2 && isSelected && "role-select-v2__role-card--selected"
        )}
        data-role-index={index}
        onClick={handleDivClick}
        onMouseLeave={onLeave}
        role="button"
        tabIndex={0}
        onKeyDown={handleDivKeyDown}
      >
        {icon.overlay && (
          <div
            className={cx(
              styles.cardOverlay,
              isSelected && styles.cardOverlaySelected,
              styles.cardOverlayInstitutions
            )}
            style={{
              backgroundImage: `url(${icon.overlaySrc})`,
              ["--institutions-hover-overlay" as string]: `url(${hoverOverlaySrc})`,
            }}
          />
        )}
        <div className={styles.cardContent}>
          <button
            type="button"
            className={styles.roleButton}
            onClick={handleButtonClick}
            aria-label={icon.alt}
          >
            <img
              decoding="async"
              src={icon.iconSrc}
              alt={icon.alt}
              className={`${styles.roleIcon} ${index === 1 ? styles.roleIconStudent : ""}`}
            />
          </button>
        </div>
        <div className={styles.institutionsHoverPanel} style={expandPanelStyle}>
          <div className={cx(styles.institutionsHoverShade, isV2 && "role-select-v2__institutions-shade")} />
          <div className={styles.institutionsHoverMeta}>
            <span className={styles.institutionsHoverIconWrap}>
              <img decoding="async" src={icon.iconSrc} alt="" className={styles.institutionsHoverIcon} />
            </span>
            <div className={styles.institutionsHoverText}>
              <h3 className={styles.institutionsTitle}>{featureCopy.title}</h3>
              <p className={styles.institutionsSubtitle}>{featureCopy.subtitle}</p>
            </div>
          </div>
        </div>
        {isSelected && (
          <span className={cx(styles.selectedBadge, isV2 && "role-select-v2__selected-badge")}>
            <span className={styles.selectedBadgeMark} aria-hidden>
              ✓
            </span>
            Выбрано
          </span>
        )}
      </div>
    );
  }
);

RoleSelectRoleCard.displayName = "RoleSelectRoleCard";

export default RoleSelectRoleCard;
