import { toJpeg, toPng } from "html-to-image";

export type ExportImageFormat = "png" | "jpeg";

export function waitForRender(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export async function exportElementAsImage(
  node: HTMLElement,
  format: ExportImageFormat,
  filename = "trassa-prezentaciya"
): Promise<void> {
  const options = {
    pixelRatio: 2,
    cacheBust: true,
    skipFonts: false,
  };

  const dataUrl =
    format === "png"
      ? await toPng(node, options)
      : await toJpeg(node, { ...options, quality: 0.93 });

  const link = document.createElement("a");
  link.download = `${filename}.${format === "png" ? "png" : "jpg"}`;
  link.href = dataUrl;
  link.click();
}
