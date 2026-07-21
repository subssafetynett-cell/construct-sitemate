import { useEffect } from "react";
import { downloadPdfFromRef } from "../utils/pdfGenerator";
import { downloadWordFromRef } from "../utils/downloadWordFromRef";

/**
 * Auto PDF/Word download when the form page is opened with
 * ?action=download or ?action=download_word (e.g. Performance Monitoring).
 */
export function useAutoFormDownload({
  loading,
  action,
  docKey,
  containerRef,
  fileNamePrefix,
  pdfOptions,
  setDownloading,
  wordOptions,
}) {
  useEffect(() => {
    if (loading || !docKey) return;
    const act = String(action || "").toLowerCase();
    if (act !== "download" && act !== "download_word") return;

    let cancelled = false;
    if (typeof setDownloading === "function") setDownloading(true);

    const timer = window.setTimeout(() => {
      const fileName = `${fileNamePrefix}_${docKey}`;
      const finish = (err) => {
        if (cancelled) return;
        if (typeof setDownloading === "function") setDownloading(false);
        if (err) {
          console.error("Auto download failed:", err);
          alert(
            act === "download_word"
              ? "Could not prepare Word document. Please try again."
              : "Could not prepare PDF. Please try again."
          );
          return;
        }
        window.close();
      };

      if (act === "download_word") {
        downloadWordFromRef(containerRef, fileName, finish, wordOptions || {});
      } else {
        downloadPdfFromRef(containerRef, fileName, finish, pdfOptions || {});
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    loading,
    action,
    docKey,
    containerRef,
    fileNamePrefix,
    pdfOptions,
    setDownloading,
    wordOptions,
  ]);
}
