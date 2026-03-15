import { join } from "path";
import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { WaitlistModule } from "./waitlist/waitlist.module";
import { DataLoaderModule } from "./dataloader";
import { GraphqlExceptionFilter } from "./common/filters";

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), "src/schema.gql"),
      sortSchema: true,
      playground: true,
    }),
    PrismaModule,
    DataLoaderModule,
    HealthModule,
    WaitlistModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GraphqlExceptionFilter,
    },
  ],
})
export class AppModule {}
