import { Query, Resolver } from "@nestjs/graphql";
import { Public } from "../auth";

@Resolver()
export class HealthResolver {
  @Public()
  @Query(() => String)
  ping(): string {
    return "pong";
  }
}
