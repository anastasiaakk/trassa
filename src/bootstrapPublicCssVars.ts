import { publicUrl } from "./utils/publicUrl";

/** До применения global.css — фоны с url(/…) не работают при file:// */
document.documentElement.style.setProperty(
  "--trassa-v2721-bg",
  `url(${JSON.stringify(publicUrl("v2721_115.png"))})`
);
