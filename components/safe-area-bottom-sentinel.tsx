// iOS 26 Safari no longer honors the theme-color meta tag — it colors
// the safe-area strips from the background-color of fixed/sticky elements
// near the viewport edges instead, falling back to <body> otherwise. The
// storefront pages have nothing pinned to the bottom edge (unlike admin's
// bottom nav), so without this, the bottom safe area would pick up
// <body>'s (admin) background instead of the storefront's plum. This is
// invisible — sized to exactly the home-indicator inset, nothing else.
export function SafeAreaBottomSentinel() {
    return (
        <div
            aria-hidden
            className="fixed inset-x-0 bottom-0 h-[env(safe-area-inset-bottom)] bg-background"
        />
    );
}
