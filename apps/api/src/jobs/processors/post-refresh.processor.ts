import { Injectable } from "@nestjs/common";

import type { PostRefreshJobData } from "../interfaces/post-refresh-job.interface";

@Injectable()
export class PostRefreshProcessor {
  async process(data: PostRefreshJobData) {
    return {
      status: "placeholder",
      ...data,
    };
  }
}
