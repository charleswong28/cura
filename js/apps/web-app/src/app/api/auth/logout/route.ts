import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const REFRESH_COOKIE = "cura_refresh";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    // Best-effort revocation — ignore errors
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // ignore
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
