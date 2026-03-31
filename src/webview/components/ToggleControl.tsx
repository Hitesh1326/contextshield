import type { ReactElement, ReactNode } from "react";

export type ToggleControlProps = {
  id: string;
  label: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

/**
 * Accessible switch-style toggle: checkbox with `role="switch"` and caption for screen readers.
 */
export function ToggleControl({ id, label, checked, onChange, disabled }: ToggleControlProps): ReactElement {
  const labelId = `${id}-caption`;
  return (
    <div className="toggle-row">
      <span className="toggle-label" id={labelId}>
        {label}
      </span>
      <label className="toggle" htmlFor={id}>
        <input
          id={id}
          role="switch"
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-checked={checked}
          aria-disabled={disabled ? true : undefined}
          aria-labelledby={labelId}
          onChange={(e) => {
            onChange(e.target.checked);
          }}
        />
        <span className="toggle-track" aria-hidden />
        <span className="toggle-thumb" aria-hidden />
      </label>
    </div>
  );
}
