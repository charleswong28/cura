import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClerkAuthGuard } from "./clerk.guard";
import { PrismaService } from "../prisma/prisma.service";

// Mock @clerk/backend
jest.mock("@clerk/backend", () => ({
  verifyToken: jest.fn(),
}));

import { verifyToken } from "@clerk/backend";

const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockReflector(isPublic = false): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;
}

function createMockPrisma(tenant: { id: string } | null = null): PrismaService {
  return {
    tenant: {
      findUnique: jest.fn().mockResolvedValue(tenant),
    },
  } as unknown as PrismaService;
}

function createMockGqlContext(authHeader?: string): ExecutionContext {
  const req = {
    headers: authHeader ? { authorization: authHeader } : {},
    user: undefined as any,
  };

  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    getType: jest.fn().mockReturnValue("graphql"),
    switchToHttp: jest.fn().mockReturnValue({ getRequest: () => req }),
    getArgs: jest.fn().mockReturnValue([undefined, undefined, { req }, undefined]),
    // GqlExecutionContext.create reads getArgs()[2] as the GQL context
  } as unknown as ExecutionContext;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("ClerkAuthGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows public routes without token check", async () => {
    const guard = new ClerkAuthGuard(createMockReflector(true), createMockPrisma());
    const context = createMockGqlContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedException when Authorization header is missing", async () => {
    const guard = new ClerkAuthGuard(createMockReflector(), createMockPrisma());
    const context = createMockGqlContext(); // no auth header

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when token format is wrong", async () => {
    const guard = new ClerkAuthGuard(createMockReflector(), createMockPrisma());
    const context = createMockGqlContext("Basic abc123");

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when token verification fails", async () => {
    mockVerifyToken.mockRejectedValue(new Error("invalid token"));

    const guard = new ClerkAuthGuard(createMockReflector(), createMockPrisma());
    const context = createMockGqlContext("Bearer bad_token");

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it("throws ForbiddenException when JWT has no org_id", async () => {
    mockVerifyToken.mockResolvedValue({ sub: "user_1" } as any);

    const guard = new ClerkAuthGuard(createMockReflector(), createMockPrisma());
    const context = createMockGqlContext("Bearer valid_token");

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow("No organization selected");
  });

  it("throws ForbiddenException when org is not provisioned in DB", async () => {
    mockVerifyToken.mockResolvedValue({
      sub: "user_1",
      org_id: "org_unknown",
      org_role: "org:admin",
    } as any);

    const guard = new ClerkAuthGuard(createMockReflector(), createMockPrisma(null));
    const context = createMockGqlContext("Bearer valid_token");

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow("Organization not provisioned");
  });

  it("sets req.user on successful authentication", async () => {
    mockVerifyToken.mockResolvedValue({
      sub: "user_clerk_123",
      org_id: "org_clerk_abc",
      org_role: "org:admin",
    } as any);

    const tenant = { id: "01HULID_TENANT_001" };
    const prisma = createMockPrisma(tenant);
    const guard = new ClerkAuthGuard(createMockReflector(), prisma);
    const context = createMockGqlContext("Bearer valid_token");

    const result = await guard.canActivate(context);

    expect(result).toBe(true);

    // Extract the req from the context to check user was set
    const req = context.switchToHttp().getRequest();
    expect(req.user).toEqual({
      clerkUserId: "user_clerk_123",
      tenantId: "01HULID_TENANT_001",
      orgRole: "org:admin",
    });
  });

  it("defaults orgRole to 'org:member' when not in JWT", async () => {
    mockVerifyToken.mockResolvedValue({
      sub: "user_1",
      org_id: "org_1",
    } as any);

    const prisma = createMockPrisma({ id: "tenant_1" });
    const guard = new ClerkAuthGuard(createMockReflector(), prisma);
    const context = createMockGqlContext("Bearer valid_token");

    await guard.canActivate(context);

    const req = context.switchToHttp().getRequest();
    expect(req.user.orgRole).toBe("org:member");
  });

  it("caches tenant lookup — second call does not hit DB", async () => {
    mockVerifyToken.mockResolvedValue({
      sub: "user_1",
      org_id: "org_cached",
      org_role: "org:member",
    } as any);

    const tenant = { id: "tenant_cached_id" };
    const prisma = createMockPrisma(tenant);
    const guard = new ClerkAuthGuard(createMockReflector(), prisma);

    // First call — hits DB
    await guard.canActivate(createMockGqlContext("Bearer token1"));
    // Second call — should use cache
    await guard.canActivate(createMockGqlContext("Bearer token2"));

    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(1);
  });
});
