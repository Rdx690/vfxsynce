import { NextRequest, NextResponse } from "next/server";

const PROVIDER_URL = "https://jiosavanapiryden.vercel.app/api/search/songs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();
  if (!query) return NextResponse.json({ success: false, message: "Enter a song or artist name." }, { status: 400 });
  if (query.length > 120) return NextResponse.json({ success: false, message: "Search query is too long." }, { status: 400 });

  try {
    const url = new URL(PROVIDER_URL);
    url.searchParams.set("query", query);
    const response = await fetch(url.toString(), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000), cache: "no-store" });
    if (!response.ok) return NextResponse.json({ success: false, message: `Music API returned HTTP ${response.status}.` }, { status: 502 });
    const payload: unknown = await response.json();
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("JioSaavn search proxy failed:", error);
    return NextResponse.json({ success: false, message: "Music search is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
