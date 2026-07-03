/** Printable width for A4 portrait at ~96dpi (210mm). */
export const KPI_REPORT_EXPORT_WIDTH = 794;

/** Off-screen mount that still participates in full layout for html2canvas. */
export const KPI_REPORT_EXPORT_MOUNT_STYLE = {
  position: "fixed",
  left: 0,
  top: 0,
  width: KPI_REPORT_EXPORT_WIDTH,
  overflow: "visible",
  pointerEvents: "none",
  visibility: "hidden",
  zIndex: -1,
};

/**
 * Briefly moves the export mount on-screen (still invisible) so browsers lay out
 * the full report width before html2canvas capture.
 */
export function prepareKpiExportMount(reportRef) {
  const root = reportRef?.current;
  const mount = root?.parentElement;
  if (!mount) return () => {};

  const prev = {
    position: mount.style.position,
    left: mount.style.left,
    top: mount.style.top,
    width: mount.style.width,
    opacity: mount.style.opacity,
    visibility: mount.style.visibility,
    pointerEvents: mount.style.pointerEvents,
    zIndex: mount.style.zIndex,
    overflow: mount.style.overflow,
  };

  Object.assign(mount.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${KPI_REPORT_EXPORT_WIDTH}px`,
    opacity: "1",
    visibility: "hidden",
    pointerEvents: "none",
    zIndex: "-1",
    overflow: "visible",
  });

  // Force layout so scrollWidth/scrollHeight reflect the full report.
  void root.offsetHeight;
  void root.scrollWidth;

  return () => {
    mount.style.position = prev.position;
    mount.style.left = prev.left;
    mount.style.top = prev.top;
    mount.style.width = prev.width;
    mount.style.opacity = prev.opacity;
    mount.style.visibility = prev.visibility;
    mount.style.pointerEvents = prev.pointerEvents;
    mount.style.zIndex = prev.zIndex;
    mount.style.overflow = prev.overflow;
  };
}
