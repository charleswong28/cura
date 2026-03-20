import { Global, Module } from "@nestjs/common";
import { ActivityLogService } from "./activity.service";
import { ActivityLogResolver } from "./activity.resolver";

@Global()
@Module({
  providers: [ActivityLogService, ActivityLogResolver],
  exports: [ActivityLogService],
})
export class ActivityModule {}
