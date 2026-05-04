import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { generateId } from "../common/ulid";
import { CreateTenantInput } from "./dto/create-tenant.input";

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new tenant and a User record linking the caller's AuthIdentity to it.
   * The caller becomes the first admin of the new org.
   */
  async create(userId: string, input: CreateTenantInput) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: input.slug } });
    if (existing) throw new ConflictException(`Slug '${input.slug}' is already taken.`);

    const callerUser = await this.prisma.user.findFirst({
      where: { id: userId },
      include: { authIdentity: true },
    });
    if (!callerUser?.authIdentityId || !callerUser.authIdentity)
      throw new ConflictException("Auth identity not found.");

    const identity = callerUser.authIdentity;

    // Derive user details from the auth identity email as a fallback
    const emailName = identity.email.split("@")[0] ?? "User";

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          id: generateId(),
          name: input.name,
          slug: input.slug,
        },
      });

      await tx.user.create({
        data: {
          id: generateId(),
          tenantId: tenant.id,
          authIdentityId: identity.id,
          email: identity.email,
          firstName: emailName,
          lastName: "",
          loginable: true,
        },
      });

      return tenant;
    });
  }
}
