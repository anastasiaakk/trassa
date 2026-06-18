export function getTbotTheme(isDark: boolean) {
  const muted = isDark ? "#94a3b8" : "#64748b";
  const text = isDark ? "#f1f5f9" : "#0f172a";
  const card = isDark ? "#0f172a" : "#f8fafc";
  const cardBorder = isDark ? "rgba(56, 189, 248, 0.15)" : "rgba(148, 163, 184, 0.35)";
  const insetShadow = isDark
    ? "inset 8px 8px 18px rgba(0, 0, 0, 0.28)"
    : "inset 8px 8px 18px rgba(148, 154, 178, 0.12), inset -4px -4px 12px rgba(255, 255, 255, 0.95)";
  const outerShadow = isDark
    ? "0 24px 48px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(56, 189, 248, 0.12)"
    : "0 20px 40px rgba(15, 23, 42, 0.1), 0 8px 16px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(255,255,255,0.9)";

  const headerBg = isDark
    ? "linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #172554 100%)"
    : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 45%, #f1f5f9 100%)";

  const userBubble = isDark
    ? "linear-gradient(155deg, #2563eb 0%, #1d4ed8 55%, #1e40af 100%)"
    : "linear-gradient(155deg, #3b82f6 0%, #2563eb 100%)";

  const aiBubbleBg = isDark ? "rgba(30, 41, 59, 0.92)" : "rgba(255, 255, 255, 0.95)";
  const aiBubbleBorder = isDark ? "1px solid rgba(56, 189, 248, 0.2)" : "1px solid rgba(148, 163, 184, 0.35)";

  return {
    muted,
    text,
    card,
    cardBorder,
    insetShadow,
    outerShadow,
    headerBg,
    userBubble,
    aiBubbleBg,
    aiBubbleBorder,
  };
}

export type TbotTheme = ReturnType<typeof getTbotTheme>;
