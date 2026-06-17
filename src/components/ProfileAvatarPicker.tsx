import { memo, useCallback, useEffect, useId, useRef, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { getProfileAvatarImageSrc } from "../assets/profileAvatarImages";
import {
  clearAdminAvatar,
  readAdminAvatarFile,
  saveAdminAvatar,
  saveProfileAvatarPreset,
} from "../utils/adminAvatarStorage";
import {
  PROFILE_AVATAR_PRESETS,
  parseProfileAvatarPresetId,
  presetStorageValue,
  type ProfileAvatarPresetId,
} from "../utils/profileAvatarPresets";

type Props = {
  emailNorm: string;
  currentValue: string | null;
  onClose: () => void;
  onChange: (value: string | null) => void;
  onHint?: (message: string) => void;
};

function ProfileAvatarPicker({ emailNorm, currentValue, onClose, onChange, onHint }: Props) {
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activePresetId = parseProfileAvatarPresetId(currentValue);
  const hasCustomPhoto = Boolean(currentValue?.startsWith("data:image/"));
  const hasAnyAvatar = Boolean(currentValue);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pickPreset = useCallback(
    (id: ProfileAvatarPresetId) => {
      saveProfileAvatarPreset(emailNorm, id);
      onChange(presetStorageValue(id));
      onHint?.("Аватар выбран");
      onClose();
    },
    [emailNorm, onChange, onClose, onHint]
  );

  const onFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const result = await readAdminAvatarFile(file);
      if (!result.ok) {
        onHint?.(result.error);
        return;
      }
      saveAdminAvatar(emailNorm, result.dataUrl);
      onChange(result.dataUrl);
      onHint?.("Фото сохранено");
      onClose();
    },
    [emailNorm, onChange, onClose, onHint]
  );

  const removeAvatar = useCallback(() => {
    clearAdminAvatar(emailNorm);
    onChange(null);
    onHint?.("Аватар удалён");
    onClose();
  }, [emailNorm, onChange, onClose, onHint]);

  return createPortal(
    <div className="profile-avatar-picker__backdrop" onClick={onClose}>
      <div
        className="profile-avatar-picker__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="profile-avatar-picker__header">
          <h2 id={titleId} className="profile-avatar-picker__title">
            Фото профиля
          </h2>
          <button
            type="button"
            className="profile-avatar-picker__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <svg
              className="profile-avatar-picker__close-icon"
              viewBox="0 0 24 24"
              aria-hidden
              focusable="false"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <p className="profile-avatar-picker__lead">
          Выберите персонажа или загрузите фото (до 2 МБ) — оно автоматически обрежется по центру в
          круг, как в шапке кабинета.
        </p>

        <section className="profile-avatar-picker__section" aria-label="Строительная сфера">
          <h3 className="profile-avatar-picker__section-title">Строительная сфера</h3>
          <div className="profile-avatar-picker__grid">
            {PROFILE_AVATAR_PRESETS.map((preset) => {
              const selected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`profile-avatar-picker__item${selected ? " profile-avatar-picker__item--active" : ""}`}
                  onClick={() => pickPreset(preset.id)}
                  aria-pressed={selected}
                  aria-label={selected ? `${preset.label} (выбрано)` : preset.label}
                  title={preset.label}
                >
                  {selected ? (
                    <span className="profile-avatar-picker__check" aria-hidden>
                      <svg viewBox="0 0 16 16" focusable="false">
                        <path
                          d="M3.5 8.2 6.4 11 12.5 4.8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  ) : null}
                  <span className="profile-avatar-picker__preview" aria-hidden>
                    <img
                      className="profile-avatar-picker__preview-img"
                      src={getProfileAvatarImageSrc(preset.id)}
                      alt=""
                      decoding="async"
                      draggable={false}
                    />
                  </span>
                  <span className="profile-avatar-picker__label">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="profile-avatar-picker__section" aria-label="Своё фото">
          <h3 className="profile-avatar-picker__section-title">Своё фото</h3>
          <div className="profile-avatar-picker__actions">
            <input
              ref={fileInputRef}
              className="editable-profile-avatar__input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onFileChange}
            />
            <button
              type="button"
              className="profile-avatar-picker__upload"
              onClick={() => fileInputRef.current?.click()}
            >
              {hasCustomPhoto ? "Заменить своё фото" : "Загрузить с устройства"}
            </button>
            {hasAnyAvatar ? (
              <button type="button" className="profile-avatar-picker__remove" onClick={removeAvatar}>
                Убрать аватар
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>,
    document.body
  );
}

export default memo(ProfileAvatarPicker);
