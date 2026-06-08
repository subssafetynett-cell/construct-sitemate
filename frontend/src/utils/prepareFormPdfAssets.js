import { resolveFormLogoSrc } from "./formLogoUrl";
import { fetchImageAsDataUrl } from "./compressImage";

const LOGO_OPTS = { maxWidth: 560, maxHeight: 220, quality: 0.88, thresholdBytes: 120_000 };
const PHOTO_OPTS = { maxWidth: 960, maxHeight: 960, quality: 0.76, thresholdBytes: 280_000 };
const SIG_OPTS = { maxWidth: 520, maxHeight: 160, quality: 0.82, thresholdBytes: 80_000 };

const IMAGE_KEY_PATTERN = /photo|logo|signature/i;

async function prepareImageField(out, key, src, opts) {
    const prepared = await fetchImageAsDataUrl(src, opts);
    if (!prepared) return;
    out[key] = prepared;
    if (key.endsWith("_preview")) {
        out[key.slice(0, -"_preview".length)] = prepared;
    } else {
        out[`${key}_preview`] = prepared;
    }
}

function isEmbeddableImageSrc(val) {
    return (
        typeof val === "string" &&
        (val.startsWith("data:image") ||
            val.startsWith("blob:") ||
            /^https?:\/\//i.test(val) ||
            val.startsWith("/"))
    );
}

/** Inline and compress logos, photos, and signatures before concern/weekly PDF capture. */
export async function prepareConcernWeeklyPdfAssets(values = {}, logoUrl = null, kind = "concern") {
    const out = { ...values };

    const logoSrc =
        kind === "weekly"
            ? resolveFormLogoSrc(values, logoUrl)
            : resolveFormLogoSrc(
                  {
                      company_logo: values.company_logo,
                      company_logo_preview: values.company_logo_preview,
                  },
                  logoUrl
              );

    if (logoSrc) {
        const logo = await fetchImageAsDataUrl(logoSrc, LOGO_OPTS);
        if (logo) {
            if (kind === "weekly") {
                out.logo = logo;
                out.logo_preview = logo;
            } else {
                out.company_logo = logo;
                out.company_logo_preview = logo;
            }
        }
    }

    const keys = Object.keys(values);
    await Promise.all(
        keys.map(async (key) => {
            const val = values[key];
            if (!isEmbeddableImageSrc(val)) return;
            if (!key.endsWith("_preview") && !IMAGE_KEY_PATTERN.test(key)) return;
            const opts = /signature/i.test(key) ? SIG_OPTS : PHOTO_OPTS;
            await prepareImageField(out, key, val, opts);
        })
    );

    return out;
}
