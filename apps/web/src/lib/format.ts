export function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | null) {
  if (!value) {
    return "No activity yet";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatSpeed(downKbps: number, upKbps: number) {
  const downMbps = Math.round(downKbps / 1024);
  const upMbps = Math.round(upKbps / 1024);
  return `${downMbps}M / ${upMbps}M`;
}
