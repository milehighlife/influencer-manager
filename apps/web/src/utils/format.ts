export function formatDate(
  value?: string | null,
  options: {
    mode?: "date" | "datetime";
  } = {},
) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(options.mode === "datetime" ? {} : { timeZone: "UTC" }),
  }).format(date);
}

export function formatPlatform(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
