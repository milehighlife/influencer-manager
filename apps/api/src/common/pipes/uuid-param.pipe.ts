import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

import { LOOSE_UUID_PATTERN } from "../utils/uuid.util";

@Injectable()
export class UuidParamPipe implements PipeTransform<string, string> {
  transform(value: string) {
    if (!LOOSE_UUID_PATTERN.test(value)) {
      throw new BadRequestException("Validation failed (uuid is expected).");
    }

    return value;
  }
}
