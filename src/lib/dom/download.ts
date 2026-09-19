/**
 * How long a saved file's object URL outlives the click that starts its
 * download. Some browsers resolve the URL only after the click handler returns,
 * so revoking it at once can cancel the download it was created for.
 */
export const OBJECT_URL_LIFETIME_MS = 30_000;

/**
 * Hand a file to the browser's own download flow, as if the user had
 * followed a link to it.
 *
 * The object URL this creates is released by the function itself once the
 * download has had time to start, so the caller owns nothing afterwards.
 * Invoke from browser code with a document body. DOM/download failures propagate
 * after cleanup is scheduled; this does not report whether a download finished.
 */
export function saveFile(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  try {
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    link.hidden = true;
    document.body.append(link);
    link.click();
  } finally {
    try {
      link.remove();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_LIFETIME_MS);
    }
  }
}
