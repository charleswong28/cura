import { join } from "path";
import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { JwtAuthGuard, FunctionalPermissionGuard } from "./auth";
import { AuthModule } from "./auth/auth.module";
import { PermissionModule } from "./permissions/permission.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { WaitlistModule } from "./waitlist/waitlist.module";
import { DataLoaderModule } from "./dataloader";
import { GraphqlExceptionFilter } from "./common/filters";
import { UserModule } from "./user/user.module";
import { ActivityModule } from "./activity/activity.module";
import { CandidateModule } from "./candidate/candidate.module";
import { ClientModule } from "./client/client.module";
import { JobModule } from "./job/job.module";
import { JobApplicationModule } from "./job-application/job-application.module";
import { MigrationModule } from "./migration/migration.module";
import { TeamModule } from "./team/team.module";
import { RoleModule } from "./role/role.module";

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
    AuthModule,
    PermissionModule,
    ActivityModule,
    UserModule,
    CandidateModule,
    ClientModule,
    JobModule,
    JobApplicationModule,
    MigrationModule,
    TeamModule,
    RoleModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: FunctionalPermissionGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GraphqlExceptionFilter,
    },
  ],
})
export class AppModule {}
