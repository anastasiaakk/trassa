import { memo, useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import {
  ADMIN_AVATAR_CHANGED,
  clearAdminAvatar,
  loadAdminAvatar,
  normalizeAvatarPhotoDataUrl,
  saveAdminAvatar,
} from "../utils/adminAvatarStorage";
import { parseProfileAvatarPresetId } from "../utils/profileAvatarPresets";
import { resolveToolbarAvatar } from "../utils/profileAvatarResolve";
import ProfileAvatarDisplay from "./ProfileAvatarDisplay";
import ProfileAvatarPicker from "./ProfileAvatarPicker";
import { profileAvatarMediaButtonStyle } from "./profileAvatarFillStyle";

type Props = {
  emailNorm?: string | null;
  fallbackSrc: string;
  rootClassName: string;
  editableClassName?: string;
  imgClassName?: string;
  photoImgClassName?: string;
  badgeClassName?: string;
  hintClassName?: string;
  displayName?: string;
  showHint?: boolean;
  imgSize?: number;
  onClick?: () => void;
  wrapClassName?: string;
  showFallbackWhenEmpty?: boolean;
  /** Как glass-btn «Выход»: без логотипа, пустое — иконка профиля. */
  toolbarGlass?: boolean;
  emptyIcon?: ReactNode;
};

function EditableProfileAvatar({
  emailNorm,
  fallbackSrc,
  rootClassName,
  editableClassName = "",
  imgClassName = "",
  photoImgClassName = "",
  badgeClassName = "editable-profile-avatar__badge",
  hintClassName = "editable-profile-avatar__hint",
  displayName = "Профиль",
  showHint = false,
  imgSize = 40,
  onClick,
  wrapClassName = "editable-profile-avatar__wrap",
  showFallbackWhenEmpty = false,
  toolbarGlass = false,
  emptyIcon = null,
}: Props) {
  const [stored, setStored] = useState<string | null>(() => loadAdminAvatar(emailNorm));
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [photoReady, setPhotoReady] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const refresh = useCallback(() => {
    setStored(loadAdminAvatar(emailNorm));
  }, [emailNorm]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!stored?.startsWith("data:image/")) {
      setPhotoSrc(null);
      setPhotoReady(true);
      return;
    }
    if (!emailNorm) {
      setPhotoSrc(stored);
      setPhotoReady(true);
      return;
    }
    let cancelled = false;
    setPhotoReady(false);
    void normalizeAvatarPhotoDataUrl(stored).then((normalized) => {
      if (cancelled) return;
      const next = normalized ?? stored;
      if (next !== stored) {
        saveAdminAvatar(emailNorm, next);
        setStored(next);
      }
      setPhotoSrc(next);
      setPhotoReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [stored, emailNorm]);

  useEffect(() => {
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ emailNorm?: string }>).detail;
      if (!detail?.emailNorm || detail.emailNorm === emailNorm) refresh();
    };
    window.addEventListener(ADMIN_AVATAR_CHANGED, onChanged);
    return () => window.removeEventListener(ADMIN_AVATAR_CHANGED, onChanged);
  }, [emailNorm, refresh]);

  const canEdit = Boolean(emailNorm);
  const displayStored = useMemo(() => {
    const raw = toolbarGlass ? resolveToolbarAvatar(stored, fallbackSrc) : stored;
    if (raw?.startsWith("data:image/")) {
      if (!photoReady || !photoSrc) return null;
      return photoSrc;
    }
    return raw;
  }, [toolbarGlass, stored, fallbackSrc, photoReady, photoSrc]);
  const hasAvatar = Boolean(displayStored);
  const isPresetAvatar = Boolean(parseProfileAvatarPresetId(displayStored));
  const isPhotoAvatar = Boolean(displayStored?.startsWith("data:image/"));
  const circleTitle = canEdit
    ? onClick
      ? `${displayName} · настройки профиля`
      : displayName
    : onClick
      ? `${displayName} · настройки профиля`
      : displayName;

  const badgeTitle = canEdit
    ? hasAvatar
      ? "Сменить аватар"
      : "Выбрать аватар"
    : "";

  const onCircleClick = useCallback(() => {
    if (!canEdit) {
      onClick?.();
      return;
    }
    onClick?.();
  }, [canEdit, onClick]);

  const onBadgeClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canEdit || !emailNorm) return;
      if (e.shiftKey && stored) {
        clearAdminAvatar(emailNorm);
        setStored(null);
        setHint("Аватар удалён");
        window.setTimeout(() => setHint(null), 2200);
        return;
      }
      setPickerOpen(true);
    },
    [canEdit, emailNorm, stored],
  );

  const onPickerHint = useCallback((message: string) => {
    setHint(message);
    window.setTimeout(() => setHint(null), 2200);
  }, []);

  return (
    <div className={wrapClassName}>
      <button
        type="button"
        className={`${rootClassName}${canEdit ? ` editable-profile-avatar--editable ${editableClassName}`.trim() : ""}${hasAvatar ? " editable-profile-avatar--has-media" : ""}${isPresetAvatar ? " editable-profile-avatar--preset" : ""}${isPhotoAvatar ? " editable-profile-avatar--photo" : ""}${!hasAvatar ? " editable-profile-avatar--empty" : ""}`}
        style={imgSize > 0 ? profileAvatarMediaButtonStyle(imgSize) : undefined}
        title={circleTitle}
        aria-label={circleTitle}
        onClick={onCircleClick}
      >
        <ProfileAvatarDisplay
          stored={displayStored}
          fallbackSrc={fallbackSrc}
          size={imgSize}
          imgClassName={imgClassName}
          photoImgClassName={photoImgClassName}
          showFallbackWhenEmpty={showFallbackWhenEmpty && !toolbarGlass}
        />
        {toolbarGlass && !displayStored ? emptyIcon : null}
      </button>
      {canEdit ? (
        <button
          type="button"
          className={badgeClassName}
          title={badgeTitle}
          aria-label={badgeTitle}
          onClick={onBadgeClick}
        >
          {hasAvatar ? "✎" : "+"}
        </button>
      ) : null}
      {showHint && hint ? (
        <p className={hintClassName} role="status">
          {hint}
        </p>
      ) : null}
      {pickerOpen && emailNorm ? (
        <ProfileAvatarPicker
          emailNorm={emailNorm}
          currentValue={stored}
          onClose={() => setPickerOpen(false)}
          onChange={setStored}
          onHint={onPickerHint}
        />
      ) : null}
    </div>
  );
}

export default memo(EditableProfileAvatar);
