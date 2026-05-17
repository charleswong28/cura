import { ObjectType, Field, Int } from "@nestjs/graphql";
import { ClientModel } from "./client.model";
import { PageInfo } from "./page-info.model";

@ObjectType()
export class ClientEdge {
  @Field(() => String)
  cursor!: string;

  @Field(() => ClientModel)
  node!: ClientModel;
}

@ObjectType()
export class ClientConnection {
  @Field(() => [ClientEdge])
  edges!: ClientEdge[];

  @Field(() => PageInfo)
  pageInfo!: PageInfo;

  @Field(() => Int)
  totalCount!: number;
}
