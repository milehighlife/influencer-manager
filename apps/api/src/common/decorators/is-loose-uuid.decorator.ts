import { Matches, ValidationOptions } from "class-validator";

import { LOOSE_UUID_PATTERN } from "../utils/uuid.util";

export function IsLooseUuid(validationOptions?: ValidationOptions) {
  return Matches(LOOSE_UUID_PATTERN, {
    message: "must be a UUID.",
    ...validationOptions,
  });
}
