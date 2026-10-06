// API failures are returned to SWR and displayed by the page's recovery UI.
// Logging handled failures as console errors would also open Next's dev overlay.
export async function parkingRequest(url, options, fetcher = fetch) {
  try {
    const response = await fetcher(url, options);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        error: payload?.error || { message: `Parking information could not load (HTTP ${response.status}).` },
        status: response.status,
        data: null,
      };
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)
      || (!Object.hasOwn(payload, "data") && !payload.error)) {
      return { error: { message: "The parking service returned an invalid response." }, status: response.status, data: null };
    }
    return payload;
  } catch (error) {
    return {
      error: { message: error?.message || "The parking service could not be reached." },
      status: null,
      data: null,
    };
  }
}
