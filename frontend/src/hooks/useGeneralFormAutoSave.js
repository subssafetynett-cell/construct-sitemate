import { useEffect, useRef } from "react";

export const GENERAL_FORM_AUTO_SAVE_MS = 2 * 60 * 1000;

/**
 * Periodically persists in-progress form data while the user is filling a form.
 * Skips ticks while loading, downloading, or a manual save is in flight.
 */
export function useGeneralFormAutoSave({
    enabled = true,
    intervalMs = GENERAL_FORM_AUTO_SAVE_MS,
    isDirty = false,
    saving = false,
    loading = false,
    downloading = false,
    onAutoSave,
}) {
    const onAutoSaveRef = useRef(onAutoSave);
    const savingRef = useRef(saving);
    const isDirtyRef = useRef(isDirty);

    onAutoSaveRef.current = onAutoSave;
    savingRef.current = saving;
    isDirtyRef.current = isDirty;

    useEffect(() => {
        if (!enabled || loading || downloading) return undefined;

        const tick = async () => {
            if (savingRef.current || !isDirtyRef.current) return;
            try {
                await onAutoSaveRef.current?.();
            } catch (err) {
                console.warn("Auto-save failed:", err);
            }
        };

        const timerId = window.setInterval(tick, intervalMs);
        return () => window.clearInterval(timerId);
    }, [enabled, loading, downloading, intervalMs]);
}
