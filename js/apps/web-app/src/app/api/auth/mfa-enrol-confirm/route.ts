import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();

  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/mfa/enrol/confirm`, {
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
      { message: data.message ?? "MFA enrolment confirmation failed" },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
