import { ObjectType, Field, Int } from "@nestjs/graphql";
import { JobModel } from "./job.model";
import { PageInfo } from "./page-info.model";

@ObjectType()
export class JobEdge {
  @Field(() => String)
  cursor!: string;

  @Field(() => JobModel)
  node!: JobModel;
}

@ObjectType()
export class JobConnection {
  @Field(() => [JobEdge])
  edges!: JobEdge[];

  @Field(() => PageInfo)
  pageInfo!: PageInfo;

  @Field(() => Int)
  totalCount!: number;
}
