interface StatusBadgeProps {
  label: string;
  tone?: "neutral" | "info" | "primary" | "success" | "warning" | "danger";
}

export function StatusBadge({
  label,
  tone = "info",
}: StatusBadgeProps) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}
