import { memo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PAGE2_HEADER_LOGO_SRC } from "../../assets/appIcons";
import { IconProfile } from "../icons/AppToolbarIcons";
import { navigateToProfileSettings } from "../../utils/profileNavigation";
import EditableProfileAvatar from "../EditableProfileAvatar";

type Props = {
  emailNorm: string | null | undefined;
  displayName: string;
};

function AdminSoftAvatar({ emailNorm, displayName }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const openProfileSettings = useCallback(() => {
    navigateToProfileSettings(navigate, location.pathname);
  }, [location.pathname, navigate]);

  return (
    <EditableProfileAvatar
      emailNorm={emailNorm}
      fallbackSrc={PAGE2_HEADER_LOGO_SRC}
      wrapClassName="admin-soft-topbar__profile-wrap"
      rootClassName="admin-soft-topbar__icon-btn admin-soft-topbar__profile"
      editableClassName="admin-soft-topbar__profile--editable"
      imgClassName="admin-soft-topbar__avatar"
      photoImgClassName="admin-soft-topbar__avatar--photo"
      badgeClassName="admin-soft-topbar__profile-badge"
      hintClassName="admin-soft-topbar__profile-hint"
      displayName={displayName}
      imgSize={40}
      showFallbackWhenEmpty={false}
      toolbarGlass
      emptyIcon={<IconProfile size={18} />}
      onClick={openProfileSettings}
    />
  );
}

export default memo(AdminSoftAvatar);
