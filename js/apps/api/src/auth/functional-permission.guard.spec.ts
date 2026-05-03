import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { FunctionalPermissionGuard } from "./functional-permission.guard";
import type { RequestUser } from "./auth.types";

function buildHttpContext(user: RequestUser | undefined, shouldThrowGql = true): ExecutionContext {
  const request = user ? { user } : {};
  // Force GqlExecutionContext.create(...).getContext() to throw so the guard
  // falls back to the HTTP path. Without this, the real GqlExecutionContext
  // helper inspects fields that aren't present on a plain context object.
  if (shouldThrowGql) {
    jest.spyOn(GqlExecutionContext, "create").mockImplementationOnce(() => {
      throw new Error("not a GraphQL context");
    });
  }
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function buildGqlContext(user: RequestUser | undefined): ExecutionContext {
  const request = user ? { user } : {};
  jest.spyOn(GqlExecutionContext, "create").mockReturnValueOnce({
    getContext: () => ({ req: request }),
  } as unknown as ReturnType<typeof GqlExecutionContext.create>);
  return {
    switchToHttp: () => ({ getRequest: () => ({}) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function makeUser(permissions: string[] = []): RequestUser {
  return {
    userId: "user_1",
    tenantId: "tenant_1",
    sessionId: "sess_1",
    version: 0,
    teams: [],
    roles: [],
    permissions: new Set(permissions),
  };
}

describe("FunctionalPermissionGuard", () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: FunctionalPermissionGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new FunctionalPermissionGuard(reflector as unknown as Reflector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("allows the request when no @RequirePermission() decorator is set", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = buildHttpContext(undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("throws Forbidden when no authenticated user is on the request", () => {
    reflector.getAllAndOverride.mockReturnValue("candidate:view_all");
    const ctx = buildHttpContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("allows when the user has the exact permission", () => {
    reflector.getAllAndOverride.mockReturnValue("candidate:view_all");
    const ctx = buildHttpContext(makeUser(["candidate:view_all"]));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("allows when the user has the wildcard '*:*' (admin)", () => {
    reflector.getAllAndOverride.mockReturnValue("candidate:view_all");
    const ctx = buildHttpContext(makeUser(["*:*"]));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("rejects when the user is missing the required permission", () => {
    reflector.getAllAndOverride.mockReturnValue("candidate:edit");
    const ctx = buildHttpContext(makeUser(["candidate:view_all"]));
    expect(() => guard.canActivate(ctx)).toThrow(/Missing permission: candidate:edit/);
  });

  it("extracts the user from a GraphQL context when present", () => {
    reflector.getAllAndOverride.mockReturnValue("candidate:view_all");
    const ctx = buildGqlContext(makeUser(["candidate:view_all"]));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("falls back to the HTTP request when the GraphQL context has no req", () => {
    reflector.getAllAndOverride.mockReturnValue("candidate:view_all");
    jest.spyOn(GqlExecutionContext, "create").mockReturnValueOnce({
      getContext: () => ({}),
    } as unknown as ReturnType<typeof GqlExecutionContext.create>);
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user: makeUser(["candidate:view_all"]) }) }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
