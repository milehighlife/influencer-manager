import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
}

export function StarRating({ value, onChange, disabled }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const interactive = Boolean(onChange) && !disabled;

  return (
    <span
      className="star-rating"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            className={`star-rating-star ${filled ? "star-filled" : "star-empty"}`}
            disabled={!interactive}
            onMouseEnter={() => interactive && setHovered(star)}
            onClick={() => onChange?.(star)}
            aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          >
            {filled ? "\u2605" : "\u2606"}
          </button>
        );
      })}
    </span>
  );
}
