// A lost response is retried with the same offlineOrderId, including when the
// server committed the sale before the connection dropped.
export async function sendSale(
  url: string,
  options: RequestInit,
): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted || error instanceof TypeError) return null;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
