import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, ImageRun } from "docx";
import { saveAs } from "file-saver";
import { inlineImagesForPdfCapture } from "./compressImage";
import { downloadPdfFromRef, html2canvasOnClone } from "./pdfGenerator";
import { prepareKpiExportMount } from "./kpiReportExportConstants";

export { KPI_REPORT_EXPORT_WIDTH, KPI_REPORT_EXPORT_MOUNT_STYLE } from "./kpiReportExportConstants";

export const KPI_REPORT_PDF_OPTIONS = {
  paginateBlocks: true,
  blockScale: 2,
  jpegQuality: 0.9,
  chartWaitTimeoutMs: 5000,
  skipBuiltInFooter: true,
  headerInsetMm: 6,
  footerInsetMm: 6,
  marginX: 10,
};

function blockHasLayout(el) {
  const w = el.offsetWidth || el.scrollWidth || el.clientWidth;
  const h = el.offsetHeight || el.scrollHeight || el.clientHeight;
  return w > 0 && h > 0;
}

function getTopLevelPdfBlocks(root) {
  const all = Array.from(root.querySelectorAll("[data-pdf-block]"));
  return all.filter((el) => {
    let parent = el.parentElement;
    while (parent && parent !== root) {
      if (parent.hasAttribute("data-pdf-block")) return false;
      parent = parent.parentElement;
    }
    return blockHasLayout(el);
  });
}

function chartSvgReady(svg) {
  if (!svg) return false;
  return Boolean(
    svg.querySelector(".recharts-bar-rectangle") ||
      svg.querySelector("path.recharts-rectangle") ||
      svg.querySelector(".recharts-layer.recharts-bar") ||
      svg.querySelector("path.recharts-curve") ||
      svg.querySelector(".recharts-line-curve") ||
      svg.querySelector(".recharts-pie-sector") ||
      svg.querySelector("path.recharts-sector")
  );
}

function waitForImages(root, timeoutMs = 8000) {
  const imgs = Array.from(root.querySelectorAll("img")).filter((img) => img.getAttribute("src"));
  if (imgs.length === 0) return Promise.resolve();

  const waitOne = (img) =>
    new Promise((resolve) => {
      if (img.complete && img.naturalWidth > 0) {
        resolve();
        return;
      }
      const done = () => resolve();
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });

  return Promise.race([
    Promise.all(imgs.map(waitOne)),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

function waitForCharts(root, timeoutMs = 5000) {
  const chartRoots = Array.from(root.querySelectorAll("[data-pdf-chart]"));
  if (chartRoots.length === 0) return Promise.resolve();

  const started = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const ready = chartRoots.every((chartRoot) => {
        const svg = chartRoot.querySelector("svg");
        return chartSvgReady(svg);
      });
      if (ready || Date.now() - started >= timeoutMs) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function prepareReportRoot(root, options = {}) {
  await inlineImagesForPdfCapture(root, options.imageShrinkOpts);
  await waitForImages(root, options.imageWaitTimeoutMs ?? 8000);
  await waitForCharts(root, options.chartWaitTimeoutMs ?? KPI_REPORT_PDF_OPTIONS.chartWaitTimeoutMs);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function captureDimensions(element) {
  const width = Math.max(element.scrollWidth, element.offsetWidth, element.clientWidth, 1);
  const height = Math.max(element.scrollHeight, element.offsetHeight, element.clientHeight, 1);
  return { width, height };
}

async function captureElementAsJpeg(element, scale = 2) {
  const { width, height } = captureDimensions(element);
  const canvas = await html2canvas(element, {
    useCORS: true,
    allowTaint: false,
    scale,
    logging: false,
    backgroundColor: "#ffffff",
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    onclone: html2canvasOnClone,
  });
  return canvas;
}

export async function downloadKpiReportPdf(reportRef, fileName, onComplete = null, options = {}) {
  const merged = { ...KPI_REPORT_PDF_OPTIONS, ...options };
  const restoreMount = prepareKpiExportMount(reportRef);
  try {
    return await downloadPdfFromRef(reportRef, fileName, onComplete, merged);
  } finally {
    restoreMount();
  }
}

export async function downloadKpiReportWord(reportRef, fileName = "KPI_Report", onComplete = null) {
  if (!reportRef?.current) {
    console.error("No report reference provided for Word export.");
    if (onComplete) onComplete(new Error("No report reference"));
    return;
  }

  const restoreMount = prepareKpiExportMount(reportRef);
  try {
    const root = reportRef.current;
    await prepareReportRoot(root);

    const blocks = getTopLevelPdfBlocks(root);
    if (blocks.length === 0) {
      throw new Error("No report content found to export.");
    }

    const children = [];
    const maxImageWidth = 560;

    for (const block of blocks) {
      const canvas = await captureElementAsJpeg(block, 2);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const aspect = canvas.height / canvas.width;
      const width = maxImageWidth;
      const height = Math.max(40, Math.round(width * aspect));

      children.push(
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new ImageRun({
              data: dataUrlToUint8Array(dataUrl),
              transformation: { width, height },
            }),
          ],
        })
      );
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 720, right: 720, bottom: 720, left: 720 },
            },
          },
          children,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${fileName}.docx`);
    if (onComplete) onComplete();
  } catch (err) {
    console.error("KPI Word export failed:", err);
    if (onComplete) onComplete(err);
    throw err;
  } finally {
    restoreMount();
  }
}
