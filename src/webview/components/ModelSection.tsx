import type { ReactElement } from "react";
import type { WebviewModelStatus } from "../types";

/** Local model id, load status, and download action for the settings panel. */
export type ModelSectionProps = {
  modelId: string;
  modelStatus: WebviewModelStatus;
  statusDetail?: string;
  onDownload: () => void;
  onDeleteCache: () => void;
};

/** Short label for the status dot + text row (uses `detail` when provided). */
function statusLabel(status: WebviewModelStatus, detail?: string): string {
  switch (status) {
    case "unknown":
      return detail ?? "Not downloaded";
    case "downloading":
      return detail ?? "Downloading model";
    case "ready":
      return "Ready";
    case "error":
      return detail ?? "Failed to load";
    default:
      return status;
  }
}

/**
 * On-device model section: shows model id, download / ready state, and optional progress affordance.
 */
export function ModelSection({
  modelId,
  modelStatus,
  statusDetail,
  onDownload,
  onDeleteCache
}: ModelSectionProps): ReactElement {
  const downloading = modelStatus === "downloading";
  const ready = modelStatus === "ready";
  const unknown = modelStatus === "unknown";
  const error = modelStatus === "error";
  const btnDisabled = downloading || ready;
  const deleteDisabled = downloading || unknown;
  const btnText = ready ? "Model ready" : downloading ? "Downloading…" : error ? "Retry download" : "Download model";

  return (
    <div className="section pb-0">
      <div className={`model-card${error ? " model-card-error" : ""}`}>
        <div className="model-name">{modelId}</div>
        <div className="model-status">
          <span className={`status-dot ${modelStatus}`} />
          <span>{statusLabel(modelStatus, statusDetail)}</span>
        </div>
        {error && statusDetail !== undefined && statusDetail.length > 0 ? (
          <p className="hint model-error-detail" role="status">
            {statusDetail}
          </p>
        ) : null}
        <div className={`progress-bar-wrap${downloading ? " visible" : ""}`}>
          <div className="progress-bar-inner" />
        </div>
        <button type="button" className="cs-btn cs-btn-primary" disabled={btnDisabled} onClick={onDownload}>
          {btnText}
        </button>
        <div className="cs-btn-row">
          <button
            type="button"
            className="cs-btn cs-btn-secondary"
            disabled={deleteDisabled}
            onClick={onDeleteCache}
          >
            Delete local model cache
          </button>
        </div>
      </div>
      <p className="hint mt-1.5">
        Runs locally. Initial model download may take several minutes.
      </p>
    </div>
  );
}
