import { useId, useState, type ReactElement, type ReactNode } from "react";

export type CollapsibleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * Disclosure panel for long sidebar content: heading button toggles visibility with proper ARIA.
 */
export function CollapsibleSection({
  title,
  defaultOpen = true,
  children
}: CollapsibleSectionProps): ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  const headingId = useId();
  const panelId = useId();

  return (
    <section className="cs-collapsible" aria-labelledby={headingId}>
      <button
        type="button"
        id={headingId}
        className="cs-collapsible-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        <span className="cs-collapsible-chevron" aria-hidden>
          {open ? "▼" : "▶"}
        </span>
        <span className="section-title cs-collapsible-title">{title}</span>
      </button>
      <div id={panelId} className="cs-collapsible-panel" hidden={!open}>
        {children}
      </div>
    </section>
  );
}
