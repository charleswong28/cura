import { ObjectType, Field, ID, registerEnumType } from "@nestjs/graphql";

export enum ClientTimelineEventType {
  CLIENT_CREATED = "CLIENT_CREATED",
  CONTACT_ADDED = "CONTACT_ADDED",
  JOB_OPENED = "JOB_OPENED",
}
registerEnumType(ClientTimelineEventType, { name: "ClientTimelineEventType" });

@ObjectType()
export class ClientTimelineEntry {
  @Field(() => ID)
  id!: string;

  @Field(() => ClientTimelineEventType)
  type!: ClientTimelineEventType;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => Date)
  occurredAt!: Date;

  @Field(() => String, { nullable: true })
  userId!: string | null;
}
