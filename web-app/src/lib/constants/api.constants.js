export const DEFAULT_SWR_OPTIONS = {
  revalidateOnFocus: false,
  revalidateIfStale: false,
  revalidateOnReconnect: false,
};

export const getInternalAuthHeader = (method = "GET", body = null) => {
  const requestConfig = {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": `Bearer ${process.env.NEXT_PUBLIC_INTERNAL_API_KEY}`,
    },
  };
  if (body) {
    requestConfig.body = body ? JSON.stringify(body) : "";
  }

  return requestConfig;
};
