export function resolveDateRange(
  range: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined,
): { from: Date; to: Date } {
  const now = new Date();

  if (range === "custom" && startDate && endDate) {
    return {
      from: new Date(`${startDate}T00:00:00.000Z`),
      to: new Date(`${endDate}T23:59:59.999Z`),
    };
  }

  if (range === "24h") {
    return { from: new Date(now.getTime() - 24 * 60 * 60 * 1000), to: now };
  }

  if (range === "7d" || range === "Last 7 Days" || range === undefined) {
    return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
  }

  if (range === "30d" || range === "Last 30 Days") {
    return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
  }

  if (range === "90d" || range === "Last 90 Days") {
    return { from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), to: now };
  }

  return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
}
