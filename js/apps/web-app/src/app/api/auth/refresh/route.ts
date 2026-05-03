import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const REFRESH_COOKIE = "cura_refresh";
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: "No refresh token" }, { status: 401 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return NextResponse.json({ message: "API unreachable" }, { status: 503 });
  }

  const data = await res.json();

  if (!res.ok) {
    // Refresh failed — clear stale cookie so middleware redirects to login
    const response = NextResponse.json(
      { message: data.message ?? "Session expired" },
      { status: 401 }
    );
    response.cookies.delete(REFRESH_COOKIE);
    return response;
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
