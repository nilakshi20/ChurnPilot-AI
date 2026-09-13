export function formatCurrency(value: number | null | undefined, currency = "USD", maximumFractionDigits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(maximumFractionDigits)}`;
  }
}

export function formatCompactCurrency(value: number | null | undefined, currency = "USD"): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return formatCurrency(value, currency);
  }
}

export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function formatNumber(value: number | null | undefined, fractionDigits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatRelativeDays(days: number | null | undefined): string {
  if (days === null || days === undefined || Number.isNaN(days)) {
    return "—";
  }
  const rounded = Math.round(days);
  if (rounded <= 0) {
    return "Today";
  }
  if (rounded === 1) {
    return "Yesterday";
  }
  if (rounded < 30) {
    return `${rounded} days ago`;
  }
  const months = Math.round(rounded / 30);
  return months <= 1 ? "About a month ago" : `About ${months} months ago`;
}

export function formatMonth(period: string): string {
  const [year, month] = period.split("-");
  if (!year || !month) {
    return period;
  }
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) {
    return period;
  }
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function customerName(customer: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string;
}): string {
  const parts = [customer.first_name, customer.last_name].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" ");
  }
  return customer.email ?? "Unnamed customer";
}

export function initials(value: string): string {
  const parts = value.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) {
    return "?";
  }
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}
