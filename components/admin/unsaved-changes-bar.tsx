"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Save, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const SAVED_NOTICE_MS = 2500;

export const LEAVE_WITH_UNSAVED_CHANGES_MESSAGE =
    "Máte neuložené změny dostupnosti. Opravdu odejít?";

// Warns before leaving with unsaved changes - both a reload/closed tab
// (beforeunload) and an in-app link like the bottom nav. Next.js Link
// navigates on its own click handler, so the click is caught in the capture
// phase on document, before it reaches React.
export function useConfirmLeaveWhenDirty(isDirty: boolean) {
    useEffect(() => {
        if (!isDirty) return;

        function handleBeforeUnload(event: BeforeUnloadEvent) {
            event.preventDefault();
        }

        function handleLinkClick(event: MouseEvent) {
            const link = (event.target as Element | null)?.closest("a[href]");
            if (!(link instanceof HTMLAnchorElement)) return;
            if (link.target === "_blank") return;
            if (window.confirm(LEAVE_WITH_UNSAVED_CHANGES_MESSAGE)) return;
            event.preventDefault();
            event.stopPropagation();
        }

        window.addEventListener("beforeunload", handleBeforeUnload);
        document.addEventListener("click", handleLinkClick, true);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener("click", handleLinkClick, true);
        };
    }, [isDirty]);
}

export function useSavedNotice() {
    const [isSavedNoticeShown, setIsSavedNoticeShown] = useState(false);

    useEffect(() => {
        if (!isSavedNoticeShown) return;
        const timeout = setTimeout(
            () => setIsSavedNoticeShown(false),
            SAVED_NOTICE_MS
        );
        return () => clearTimeout(timeout);
    }, [isSavedNoticeShown]);

    const showSavedNotice = useCallback(() => setIsSavedNoticeShown(true), []);
    return { isSavedNoticeShown, showSavedNotice };
}

// Sticky above the bottom nav, so saving doesn't need a scroll past a long
// form; only shown while there is something to save (or just was saved).
export function UnsavedChangesBar({
    isDirty,
    isSaving,
    isSavedNoticeShown,
    onDiscard,
    onSave,
}: {
    isDirty: boolean;
    isSaving: boolean;
    isSavedNoticeShown: boolean;
    onDiscard: () => void;
    // Without it the button submits the surrounding form.
    onSave?: () => void;
}) {
    if (!isDirty && !isSaving && !isSavedNoticeShown) return null;
    const isNoticeOnly = isSavedNoticeShown && !isDirty && !isSaving;

    return (
        <div className="sticky bottom-[calc(var(--admin-nav-height)+env(safe-area-inset-bottom))] -mx-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur transition-[translate,opacity] duration-200 starting:translate-y-4 starting:opacity-0">
            {isNoticeOnly ? (
                <span
                    role="status"
                    className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary"
                >
                    <Check className="size-4" />
                    Uloženo
                </span>
            ) : (
                // Hidden on phones, where both buttons need the room.
                <span className="text-sm text-muted-foreground max-sm:sr-only">
                    Neuložené změny
                </span>
            )}
            {!isNoticeOnly && (
                <div className="flex gap-2 max-sm:w-full max-sm:justify-end">
                    <Button
                        type="button"
                        variant="ghost"
                        size="lg"
                        disabled={isSaving}
                        onClick={onDiscard}
                    >
                        <Undo2 className="size-4" />
                        Zrušit změny
                    </Button>
                    <Button
                        type={onSave ? "button" : "submit"}
                        disabled={isSaving}
                        size="lg"
                        onClick={onSave}
                    >
                        {isSaving ? (
                            <Spinner className="size-4" />
                        ) : (
                            <Save className="size-4" />
                        )}
                        {isSaving ? "Ukládám…" : "Uložit"}
                    </Button>
                </div>
            )}
        </div>
    );
}
