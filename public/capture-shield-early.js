/** Сброс щита; на телефоне/таче показ запрещён (в т.ч. старый кэш). */
(function () {
  function isTouchClient() {
    var ua = navigator.userAgent || "";
    if (/Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|HarmonyOS/i.test(ua)) {
      return true;
    }
    if (navigator.maxTouchPoints > 0) return true;
    try {
      return window.matchMedia("(pointer: coarse)").matches;
    } catch (e) {
      return false;
    }
  }

  function strip() {
    document.documentElement.classList.remove("portal-capture-shield-active");
    var old = document.getElementById("portal-capture-shield");
    if (old) old.remove();
  }

  strip();
  window.addEventListener("pageshow", strip);

  if (isTouchClient()) {
    window.__trassaActivateCaptureShield = function () {};
    window.__trassaHideCaptureShield = strip;
    var obs = new MutationObserver(function () {
      if (document.documentElement.classList.contains("portal-capture-shield-active")) {
        strip();
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }
})();
