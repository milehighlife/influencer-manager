import { Transform } from "class-transformer";

export function TransformEmptyStringToNull() {
  return Transform(({ value }) => {
    if (typeof value === "string" && value.trim() === "") {
      return null;
    }

    return value;
  });
}
