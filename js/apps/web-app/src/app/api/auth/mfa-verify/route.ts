import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const REFRESH_COOKIE = "cura_refresh";
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  const body = await req.json();

  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/mfa/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ message: "API unreachable" }, { status: 503 });
  }

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { message: data.message ?? "MFA verification failed" },
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
