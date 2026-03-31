export function getErrorMessage(error: any, fallback: string) {
  const serverMsg = error?.response?.data?.error;
  if (typeof serverMsg === "string" && serverMsg.trim()) return serverMsg.trim();
  const msg = error?.message;
  if (typeof msg === "string" && msg.trim()) return msg.trim();
  return fallback;
}

