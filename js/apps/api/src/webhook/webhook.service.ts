import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { generateId } from "../common/ulid";
import { UserRole } from "../generated/prisma/client";

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** organization.created → create Tenant row */
  async handleOrganizationCreated(data: { id: string; name: string }): Promise<void> {
    this.logger.log(`Creating tenant for Clerk org ${data.id}`);

    await this.prisma.tenant.upsert({
      where: { clerkOrgId: data.id },
      update: { name: data.name },
      create: {
        id: generateId(),
        clerkOrgId: data.id,
        name: data.name,
      },
    });
  }

  /** organization.updated → update Tenant name */
  async handleOrganizationUpdated(data: { id: string; name: string }): Promise<void> {
    this.logger.log(`Updating tenant for Clerk org ${data.id}`);

    await this.prisma.tenant.update({
      where: { clerkOrgId: data.id },
      data: { name: data.name },
    });
  }

  /** organizationMembership.created → create User row linked to Tenant */
  async handleMembershipCreated(data: {
    organization: { id: string };
    public_user_data: {
      user_id: string;
      first_name: string | null;
      last_name: string | null;
      identifier: string; // primary email
    };
    role: string;
  }): Promise<void> {
    const clerkOrgId = data.organization.id;
    const clerkUserId = data.public_user_data.user_id;

    this.logger.log(`Creating user ${clerkUserId} for Clerk org ${clerkOrgId}`);

    // Resolve Clerk org → internal tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { clerkOrgId },
      select: { id: true },
    });

    if (!tenant) {
      this.logger.warn(`Tenant not found for Clerk org ${clerkOrgId} — skipping user creation`);
      return;
    }

    const role = data.role === "org:admin" ? UserRole.ADMIN : UserRole.RECRUITER;
    const email = data.public_user_data.identifier;
    const firstName = data.public_user_data.first_name ?? "";
    const lastName = data.public_user_data.last_name ?? "";

    await this.prisma.user.upsert({
      where: { clerkUserId },
      update: {
        email,
        firstName,
        lastName,
        role,
      },
      create: {
        id: generateId(),
        tenantId: tenant.id,
        clerkUserId,
        email,
        firstName,
        lastName,
        role,
      },
    });
  }

  /** organizationMembership.deleted → delete User row */
  async handleMembershipDeleted(data: {
    organization: { id: string };
    public_user_data: { user_id: string };
  }): Promise<void> {
    const clerkUserId = data.public_user_data.user_id;

    this.logger.log(`Deleting user ${clerkUserId}`);

    // Delete if exists — ignore if already gone
    const user = await this.prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (user) {
      await this.prisma.user.delete({ where: { id: user.id } });
    }
  }

  /** user.updated → update User email/name */
  async handleUserUpdated(data: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email_addresses: Array<{ id: string; email_address: string }>;
    primary_email_address_id: string | null;
  }): Promise<void> {
    this.logger.log(`Updating user ${data.id}`);

    const user = await this.prisma.user.findUnique({
      where: { clerkUserId: data.id },
      select: { id: true },
    });

    if (!user) {
      this.logger.debug(`User ${data.id} not found in DB — skipping update`);
      return;
    }

    const primaryEmail = data.email_addresses.find((e) => e.id === data.primary_email_address_id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: data.first_name ?? "",
        lastName: data.last_name ?? "",
        ...(primaryEmail ? { email: primaryEmail.email_address } : {}),
      },
    });
  }
}
