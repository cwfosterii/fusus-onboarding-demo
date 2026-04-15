import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json(
      { ok: true, received: body, message: "Mock: camera intake accepted" },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
