import open from 'open';

/**
 * Open a URL in the user's default browser.
 * Returns true if the browser was opened successfully, false otherwise.
 */
export async function openBrowser(url: string): Promise<boolean> {
  try {
    await open(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Open a URL in the browser with console fallback.
 * If the browser can't be opened, returns the URL so the caller can display it.
 */
export async function openWithFallback(
  url: string,
): Promise<{ opened: boolean; url: string }> {
  const opened = await openBrowser(url);
  return { opened, url };
}
