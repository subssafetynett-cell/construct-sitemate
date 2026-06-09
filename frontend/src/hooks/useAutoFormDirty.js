import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Marks the form dirty when watched values change after initial load.
 */
export function useAutoFormDirty(watchDeps, { enabled = true, loading = false } = {}) {
    const [isDirty, setIsDirty] = useState(false);
    const hydratedRef = useRef(false);
    const baselineDepsRef = useRef([]);
    const shouldResetBaselineRef = useRef(false);

    const resetDirty = useCallback(() => {
        setIsDirty(false);
        shouldResetBaselineRef.current = true;
        hydratedRef.current = true;
    }, []);

    const markDirty = useCallback(() => {
        if (enabled) setIsDirty(true);
    }, [enabled]);

    useEffect(() => {
        if (loading) {
            hydratedRef.current = false;
            setIsDirty(false);
            baselineDepsRef.current = [];
            shouldResetBaselineRef.current = false;
            return;
        }

        if (shouldResetBaselineRef.current) {
            baselineDepsRef.current = watchDeps;
            shouldResetBaselineRef.current = false;
            setIsDirty(false);
            return;
        }

        if (!hydratedRef.current) {
            hydratedRef.current = true;
            baselineDepsRef.current = watchDeps;
            setIsDirty(false);
            return;
        }

        const hasChanged = watchDeps.some((dep, index) => dep !== baselineDepsRef.current[index]);
        if (hasChanged && enabled) {
            setIsDirty(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- watchDeps is the intentional dirty signal
    }, [loading, enabled, ...watchDeps]);

    return { isDirty, setIsDirty, resetDirty, markDirty };
}
