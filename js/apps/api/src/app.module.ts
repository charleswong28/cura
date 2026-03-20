import { join } from "path";
import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { ClerkAuthGuard, RolesGuard } from "./auth";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { WaitlistModule } from "./waitlist/waitlist.module";
import { WebhookModule } from "./webhook/webhook.module";
import { DataLoaderModule } from "./dataloader";
import { GraphqlExceptionFilter } from "./common/filters";
import { UserModule } from "./user/user.module";
import { InvitationModule } from "./invitation/invitation.module";
import { ActivityModule } from "./activity/activity.module";

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), "src/schema.gql"),
      sortSchema: true,
      playground: true,
      context: ({ req }: { req: any }) => ({ req }),
    }),
    PrismaModule,
    DataLoaderModule,
    HealthModule,
    WaitlistModule,
    WebhookModule,
    ActivityModule,
    UserModule,
    InvitationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GraphqlExceptionFilter,
    },
  ],
})
export class AppModule {}
