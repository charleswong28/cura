import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const REFRESH_COOKIE = "cura_refresh";
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  let body: { tenantSlug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if (!body.tenantSlug) {
    return NextResponse.json({ message: "tenantSlug is required" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/switch-tenant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken, tenantSlug: body.tenantSlug }),
    });
  } catch {
    return NextResponse.json({ message: "API unreachable" }, { status: 503 });
  }

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { message: data.message ?? "Tenant switch failed" },
      { status: res.status }
    );
  }

  const response = NextResponse.json({
    accessToken: data.accessToken,
    user: data.user,
  });

  response.cookies.set(REFRESH_COOKIE, data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}
