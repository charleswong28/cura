import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ApplicationStageType } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { JobService } from "../job/job.service";
import { generateId } from "../common/ulid";
import { CreateJobApplicationInput } from "./dto/create-job-application.input";
import { AdvanceStageInput } from "./dto/advance-stage.input";
import { AddInterviewInput, CompleteInterviewInput } from "./dto/add-interview.input";
import { AddOfferInput } from "./dto/add-offer.input";

const STAGE_ORDER: Record<ApplicationStageType, number> = {
  APPLIED: 0,
  LONGLIST: 1,
  CV_SENT: 2,
  INTERVIEW: 3,
  OFFER: 4,
  PLACEMENT: 5,
  REJECTED: -1,
};

const COUNTER_MAP: Partial<
  Record<ApplicationStageType, "interviewCount" | "offerCount" | "placementCount">
> = {
  INTERVIEW: "interviewCount",
  OFFER: "offerCount",
  PLACEMENT: "placementCount",
};

@Injectable()
export class JobApplicationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JobService) private readonly jobService: JobService
  ) {}

  async findById(id: string, tenantId: string) {
    const app = await this.prisma.forTenant(tenantId).jobApplication.findFirst({
      where: { id, deletedAt: null },
    });
    if (!app) throw new NotFoundException("JobApplication not found");
    return app;
  }

  async findByJob(jobId: string, tenantId: string) {
    return this.prisma.forTenant(tenantId).jobApplication.findMany({
      where: { jobId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(tenantId: string, userId: string, input: CreateJobApplicationInput) {
    const app = await this.prisma.forTenant(tenantId).jobApplication.create({
      data: {
        id: generateId(),
        tenantId,
        candidateId: input.candidateId,
        jobId: input.jobId,
        source: input.source ?? null,
        ownerUserId: input.ownerUserId ?? userId,
        createdById: userId,
      },
    });

    // Log the initial APPLIED stage
    await this.prisma.forTenant(tenantId).applicationStage.create({
      data: {
        id: generateId(),
        tenantId,
        applicationId: app.id,
        stage: ApplicationStageType.APPLIED,
        enteredById: userId,
      },
    });

    await this.jobService.incrementCounter(input.jobId, tenantId, "applicationCount");

    return app;
  }

  async advanceStage(id: string, tenantId: string, userId: string, input: AdvanceStageInput) {
    const app = await this.findById(id, tenantId);

    await this.prisma.forTenant(tenantId).applicationStage.create({
      data: {
        id: generateId(),
        tenantId,
        applicationId: id,
        stage: input.stage as ApplicationStageType,
        enteredById: userId,
        note: input.note ?? null,
      },
    });

    // Update maxStage if this stage is higher
    const prismaStage = input.stage as ApplicationStageType;
    const currentOrder = STAGE_ORDER[app.maxStage];
    const newOrder = STAGE_ORDER[prismaStage];
    const isTerminal =
      prismaStage === ApplicationStageType.REJECTED ||
      prismaStage === ApplicationStageType.PLACEMENT;

    const updated = await this.prisma.forTenant(tenantId).jobApplication.update({
      where: { id },
      data: {
        updatedById: userId,
        ...(newOrder > currentOrder ? { maxStage: prismaStage } : {}),
        ...(isTerminal ? { isActive: false } : {}),
      },
    });

    // Increment job counter for notable stages
    const counterField = COUNTER_MAP[prismaStage];
    if (counterField) {
      await this.jobService.incrementCounter(app.jobId, tenantId, counterField);
    }

    return updated;
  }

  async addInterview(id: string, tenantId: string, userId: string, input: AddInterviewInput) {
    await this.findById(id, tenantId);
    return this.prisma.forTenant(tenantId).interview.create({
      data: {
        id: generateId(),
        tenantId,
        applicationId: id,
        round: input.round,
        scheduledAt: input.scheduledAt,
        interviewerUserId: input.interviewerUserId ?? null,
        createdById: userId,
      },
    });
  }

  async completeInterview(interviewId: string, tenantId: string, input: CompleteInterviewInput) {
    return this.prisma.forTenant(tenantId).interview.update({
      where: { id: interviewId },
      data: {
        completedAt: new Date(),
        feedback: input.feedback ?? null,
        rating: input.rating ?? null,
      },
    });
  }

  async addOffer(id: string, tenantId: string, userId: string, input: AddOfferInput) {
    await this.findById(id, tenantId);
    return this.prisma.forTenant(tenantId).offer.create({
      data: {
        id: generateId(),
        tenantId,
        applicationId: id,
        amount: input.amount ?? null,
        currency: input.currency ?? "USD",
        startDate: input.startDate ?? null,
        createdById: userId,
      },
    });
  }

  async findStages(applicationId: string, tenantId: string) {
    return this.prisma.forTenant(tenantId).applicationStage.findMany({
      where: { applicationId },
      orderBy: { enteredAt: "asc" },
    });
  }

  async findInterviews(applicationId: string, tenantId: string) {
    return this.prisma.forTenant(tenantId).interview.findMany({
      where: { applicationId },
      orderBy: { round: "asc" },
    });
  }

  async findOffers(applicationId: string, tenantId: string) {
    return this.prisma.forTenant(tenantId).offer.findMany({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
    });
  }
}
