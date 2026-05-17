import { ObjectType, Field, Int } from "@nestjs/graphql";
import { CandidateModel } from "./candidate.model";
import { PageInfo } from "./page-info.model";

@ObjectType()
export class CandidateEdge {
  @Field(() => String)
  cursor!: string;

  @Field(() => CandidateModel)
  node!: CandidateModel;
}

@ObjectType()
export class CandidateConnection {
  @Field(() => [CandidateEdge])
  edges!: CandidateEdge[];

  @Field(() => PageInfo)
  pageInfo!: PageInfo;

  @Field(() => Int)
  totalCount!: number;
}
