import { Inject, Injectable } from "@nestjs/common";
import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { PrismaService } from "../prisma/prisma.service";

const ROLE_TO_CLERK: Record<string, string> = {
  ADMIN: "org:admin",
  RECRUITER: "org:member",
};

export interface InvitationDTO {
  id: string;
  emailAddress: string;
  role: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class InvitationService {
  private readonly clerk: ClerkClient;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    this.clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
  }

  async invite(tenantId: string, email: string, role: string): Promise<InvitationDTO> {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { clerkOrgId: true },
    });

    const invitation = await this.clerk.organizations.createOrganizationInvitation({
      organizationId: tenant.clerkOrgId,
      emailAddress: email,
      role: ROLE_TO_CLERK[role] ?? "org:member",
      inviterUserId: "", // Clerk requires this but accepts empty for API-based invites
    });

    return {
      id: invitation.id,
      emailAddress: invitation.emailAddress,
      role: invitation.role,
      status: invitation.status ?? "pending",
      createdAt: new Date(invitation.createdAt),
    };
  }

  async listPending(tenantId: string): Promise<InvitationDTO[]> {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { clerkOrgId: true },
    });

    const { data } = await this.clerk.organizations.getOrganizationInvitationList({
      organizationId: tenant.clerkOrgId,
      status: ["pending"],
    });

    return data.map((inv) => ({
      id: inv.id,
      emailAddress: inv.emailAddress,
      role: inv.role,
      status: inv.status ?? "pending",
      createdAt: new Date(inv.createdAt),
    }));
  }

  async revoke(tenantId: string, invitationId: string): Promise<InvitationDTO> {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { clerkOrgId: true },
    });

    const invitation = await this.clerk.organizations.revokeOrganizationInvitation({
      organizationId: tenant.clerkOrgId,
      invitationId,
      requestingUserId: "", // API-based revocation
    });

    return {
      id: invitation.id,
      emailAddress: invitation.emailAddress,
      role: invitation.role,
      status: invitation.status ?? "pending",
      createdAt: new Date(invitation.createdAt),
    };
  }
}
