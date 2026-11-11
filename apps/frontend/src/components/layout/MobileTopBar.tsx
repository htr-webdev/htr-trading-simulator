const ICON_BUTTONS = [
  {
    id: "drawings",
    label: "Drawings",
    path: "M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  },
  {
    id: "settings",
    label: "Settings",
    path: "M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.65 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.61.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.09.48 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z",
  },
  {
    id: "menu",
    label: "Menu",
    path: "M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z",
  },
] as const;

/**
 * Mobile top bar: brand title plus icon placeholder buttons.
 *
 * The icons are disabled until their features exist; the placement
 * follows the approved mobile design.
 */
function MobileTopBar() {
  return (
    <div
      data-testid="mobile-top-bar"
      className="flex h-11 shrink-0 items-center justify-between border-b border-terminal-border bg-terminal-panel px-3"
    >
      <span className="text-sm font-semibold">HTR Terminal</span>

      <div className="flex items-center gap-1">
        {ICON_BUTTONS.map((icon) => (
          <button
            key={icon.id}
            type="button"
            disabled
            title={`${icon.label} — available in a later issue`}
            aria-label={icon.label}
            className="rounded p-1.5 text-terminal-muted opacity-60"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-current"
            >
              <path d={icon.path} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

export default MobileTopBar;
