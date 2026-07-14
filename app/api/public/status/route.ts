/**
 * Lightweight variant of /api/public/today for the hyperpolymath.com widget
 * (sealed decision D8): just enough for a compact status chip. Same CORS and
 * caching policy as /today.
 */
import { NextResponse, type NextRequest } from "next/server";
import { loadJourney } from "@/components/journey/data";
import { corsHeaders } from "../_lib/cors";
import { buildStatusPayload } from "../_lib/payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const view = await loadJourney();
  return NextResponse.json(buildStatusPayload(view), {
    headers: {
      ...corsHeaders(origin),
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}
