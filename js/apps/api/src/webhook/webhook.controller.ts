import {
  Controller,
  Post,
  Headers,
  RawBody,
  HttpCode,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { Webhook } from "svix";
import { Public } from "../auth";
import { WebhookService } from "./webhook.service";

/** Clerk webhook event types we handle */
type ClerkEventType =
  | "organization.created"
  | "organization.updated"
  | "organizationMembership.created"
  | "organizationMembership.deleted"
  | "user.updated";

interface ClerkWebhookEvent {
  type: ClerkEventType;
  data: Record<string, any>;
}

@Public()
@Controller("webhooks/clerk")
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @HttpCode(200)
  async handleClerkWebhook(
    @RawBody() rawBody: Buffer,
    @Headers("svix-id") svixId: string,
    @Headers("svix-timestamp") svixTimestamp: string,
    @Headers("svix-signature") svixSignature: string
  ): Promise<{ received: boolean }> {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error("CLERK_WEBHOOK_SECRET is not configured");
      throw new BadRequestException("Webhook secret not configured");
    }

    // Verify signature using Svix
    const wh = new Webhook(secret);
    let event: ClerkWebhookEvent;

    try {
      event = wh.verify(rawBody.toString(), {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${err}`);
      throw new BadRequestException("Invalid webhook signature");
    }

    this.logger.log(`Received Clerk webhook: ${event.type}`);

    // Route to appropriate handler
    switch (event.type) {
      case "organization.created":
        await this.webhookService.handleOrganizationCreated(event.data as any);
        break;

      case "organization.updated":
        await this.webhookService.handleOrganizationUpdated(event.data as any);
        break;

      case "organizationMembership.created":
        await this.webhookService.handleMembershipCreated(event.data as any);
        break;

      case "organizationMembership.deleted":
        await this.webhookService.handleMembershipDeleted(event.data as any);
        break;

      case "user.updated":
        await this.webhookService.handleUserUpdated(event.data as any);
        break;

      default:
        this.logger.debug(`Unhandled webhook event type: ${event.type}`);
    }

    return { received: true };
  }
}
