import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { generateId } from "../common/ulid";

@Injectable()
export class WaitlistService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Adds an email to the waitlist. Idempotent — silently succeeds if the
   * email already exists so the form can be re-submitted without an error.
   */
  async addEmail(email: string): Promise<void> {
    await this.prisma.waitlistEntry.upsert({
      where: { email },
      update: {},
      create: { id: generateId(), email },
    });
  }
}
