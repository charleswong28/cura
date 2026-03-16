import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isOrgSetupRoute = createRouteMatcher(["/org-setup(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  const { orgId } = await auth.protect();

  // Authenticated but no active organization — redirect to org setup
  if (!orgId && !isOrgSetupRoute(request)) {
    return NextResponse.redirect(new URL("/org-setup", request.url));
  }

  // Has org but visiting org-setup — redirect to dashboard
  if (orgId && isOrgSetupRoute(request)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
