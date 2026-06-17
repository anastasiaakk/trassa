/**
 * Файлы из `public/` (после сборки — рядом с index.html).
 * Разрешаем от корня приложения, а не от текущего path (/services#/… ломал ./tagjs/*.svg).
 */
export function publicUrl(path: string): string {
  const p = path.replace(/^\/+/, "");
  const base = import.meta.env.BASE_URL;
  const rel = base.endsWith("/") ? `${base}${p}` : `${base}/${p}`;

  if (typeof document !== "undefined" && document.baseURI) {
    try {
      const doc = new URL(document.baseURI);
      const tail = doc.pathname.split("/").pop() ?? "";
      const hasFile = /\.[a-z0-9]+$/i.test(tail);
      const docDir =
        doc.pathname.endsWith("/") || !hasFile
          ? `${doc.origin}/`
          : doc.href.slice(0, doc.href.lastIndexOf("/") + 1);
      return new URL(rel, docDir).href;
    } catch {
      /* fallback */
    }
  }

  return rel;
}
