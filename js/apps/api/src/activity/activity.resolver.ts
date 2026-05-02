import { Inject } from "@nestjs/common";
import { Resolver, Query, Args } from "@nestjs/graphql";
import { ActivityLogModel } from "../common/graphql/models/activity-log.model";
import { CurrentUser } from "../auth";
import type { RequestUser } from "../auth";
import { ActivityLogService } from "./activity.service";
import { ActivityLogArgs } from "./dto/activity-log-args";

@Resolver(() => ActivityLogModel)
export class ActivityLogResolver {
  constructor(
    @Inject(ActivityLogService)
    private readonly activityLogService: ActivityLogService
  ) {}

  @Query(() => [ActivityLogModel], { description: "Recent activity log entries" })
  async activityLog(
    @CurrentUser() authUser: RequestUser,
    @Args({ type: () => ActivityLogArgs }) args: ActivityLogArgs
  ) {
    return this.activityLogService.findRecent(authUser.tenantId, args.limit, args.offset);
  }
}
