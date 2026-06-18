import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAdminStats } from "../api/adminStatsApi";
import { loadMapSubjectOrganizations } from "../utils/mapSubjectOrganizations";
import { exportElementAsImage, waitForRender, type ExportImageFormat } from "../utils/exportPresentationImage";
import { SLIDES, SLIDE_W, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, type PresentationStats, type SlideId } from "../components/admin/presentation/presentationConfig";
import { collectStats, formatStat } from "../components/admin/presentation/presentationStats";
import type { KpiItem } from "../components/admin/presentation/presentationDeckChrome";

export function useAdminPresentation() {
  const slideRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState<SlideId>("cover");
  const [batchSlide, setBatchSlide] = useState<SlideId | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [stats, setStats] = useState<PresentationStats>(() =>
    collectStats(loadMapSubjectOrganizations())
  );
  const [statsUpdatedAt, setStatsUpdatedAt] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [exportBusy, setExportBusy] = useState<ExportImageFormat | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.75);

  const reloadStats = useCallback(async () => {
    setLoading(true);
    const mapEntries = loadMapSubjectOrganizations();
    const base = collectStats(mapEntries);
    const r = await fetchAdminStats(30);
    setStats({
      ...base,
      users: r.ok ? r.stats.registrations.totalUsers : base.users,
    });
    setStatsUpdatedAt(new Date());
    setLoading(false);
  }, []);

  const zoomFit = useCallback(() => {
    const el = previewRef.current;
    if (!el) return;
    const w = el.clientWidth - 48;
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, w / SLIDE_W)));
  }, []);

  useEffect(() => {
    void reloadStats();
  }, [reloadStats]);

  useEffect(() => {
    const t = window.setTimeout(() => zoomFit(), 80);
    return () => window.clearTimeout(t);
  }, [zoomFit, activeSlide]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => zoomFit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoomFit]);

  const kpis = useMemo<KpiItem[]>(
    () => [
      { value: formatStat(stats.organizations), line1: "организаций", line2: "в контуре" },
      {
        value: formatStat(stats.specializations || stats.mapEntries),
        line1: "направлений",
        line2: "и программ",
      },
      {
        value: formatStat(stats.users > 0 ? stats.users : stats.mapEntries),
        line1: stats.users > 0 ? "пользователей" : "точек",
        line2: stats.users > 0 ? "зарегистрировано" : "на карте",
      },
    ],
    [stats]
  );

  const mapSubjects = useMemo(() => {
    const entries = loadMapSubjectOrganizations();
    return Array.from(new Set(entries.map((e) => e.subjectName.trim()).filter(Boolean)));
  }, []);

  const updatedLabel = useMemo(
    () =>
      statsUpdatedAt.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [statsUpdatedAt]
  );

  const exportBaseName = SLIDES.find((s) => s.id === activeSlide)?.exportName ?? "trassa-prezentaciya";

  const download = useCallback(
    async (format: ExportImageFormat) => {
      const node = slideRef.current;
      if (!node) return;
      setExportBusy(format);
      setError(null);
      setNotice(null);
      try {
        await waitForRender();
        await new Promise((r) => window.setTimeout(r, 480));
        await exportElementAsImage(node, format, exportBaseName);
        setNotice(
          `Слайд «${SLIDES.find((s) => s.id === activeSlide)?.label}» сохранён (${format.toUpperCase()}, 1600×900).`
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось сохранить изображение.");
      } finally {
        setExportBusy(null);
      }
    },
    [activeSlide, exportBaseName]
  );

  const downloadAll = useCallback(async (format: ExportImageFormat) => {
    setExportBusy("all");
    setError(null);
    setNotice(null);
    try {
      for (const s of SLIDES) {
        setBatchSlide(s.id);
        await waitForRender();
        await new Promise((r) => window.setTimeout(r, 480));
        const node = exportRef.current;
        if (!node) throw new Error("Не удалось подготовить слайд для экспорта.");
        await exportElementAsImage(node, format, s.exportName);
      }
      setNotice(`Все ${SLIDES.length} слайдов сохранены (${format.toUpperCase()}).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить изображения.");
    } finally {
      setBatchSlide(null);
      setExportBusy(null);
    }
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));

  const activeSlideMeta = SLIDES.find((s) => s.id === activeSlide);

  return {
    slideRef,
    exportRef,
    previewRef,
    activeSlide,
    setActiveSlide,
    batchSlide,
    fullscreen,
    setFullscreen,
    stats,
    loading,
    exportBusy,
    error,
    notice,
    zoom,
    setZoom,
    reloadStats,
    zoomFit,
    kpis,
    mapSubjects,
    updatedLabel,
    download,
    downloadAll,
    zoomIn,
    zoomOut,
    activeSlideMeta,
  };
}
