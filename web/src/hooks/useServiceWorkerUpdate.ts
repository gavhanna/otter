import { useCallback, useEffect, useRef, useState } from "react";

type UseServiceWorkerUpdateResult = {
    hasUpdate: boolean;
    updateNow: () => void;
};

export function useServiceWorkerUpdate(): UseServiceWorkerUpdateResult {
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
        null
    );
    const shouldReloadRef = useRef(false);

    useEffect(() => {
        if (!("serviceWorker" in navigator)) {
            return;
        }

        let isMounted = true;
        let registration: ServiceWorkerRegistration | null = null;
        let removeUpdateListener: (() => void) | null = null;

        const handleControllerChange = () => {
            if (shouldReloadRef.current) {
                window.location.reload();
            }
        };

        navigator.serviceWorker.addEventListener(
            "controllerchange",
            handleControllerChange
        );

        const trackRegistration = async () => {
            registration = await navigator.serviceWorker.ready;
            if (!isMounted || !registration) {
                return;
            }

            const maybeSetWaiting = () => {
                if (
                    registration?.waiting &&
                    navigator.serviceWorker.controller
                ) {
                    setWaitingWorker(registration.waiting);
                }
            };

            maybeSetWaiting();

            const handleUpdateFound = () => {
                const newWorker = registration?.installing;
                if (!newWorker) return;

                newWorker.addEventListener("statechange", () => {
                    if (
                        newWorker.state === "installed" &&
                        navigator.serviceWorker.controller &&
                        isMounted
                    ) {
                        setWaitingWorker(registration?.waiting ?? null);
                    }
                });
            };

            registration.addEventListener("updatefound", handleUpdateFound);
            removeUpdateListener = () =>
                registration?.removeEventListener(
                    "updatefound",
                    handleUpdateFound
                );
        };

        void trackRegistration();

        return () => {
            isMounted = false;
            navigator.serviceWorker.removeEventListener(
                "controllerchange",
                handleControllerChange
            );
            removeUpdateListener?.();
        };
    }, []);

    const updateNow = useCallback(() => {
        if (!waitingWorker) {
            return;
        }
        shouldReloadRef.current = true;
        waitingWorker.postMessage({ type: "SKIP_WAITING" });
        setWaitingWorker(null);
    }, [waitingWorker]);

    return {
        hasUpdate: Boolean(waitingWorker),
        updateNow,
    };
}
