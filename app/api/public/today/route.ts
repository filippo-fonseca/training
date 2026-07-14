/**
 * Public, read-only widget endpoint for hyperpolymath.com (sealed decision
 * D8). Anon-level reads only, via the same `loadJourney` the journey page
 * uses (RLS-safe by construction, falls back to the local fixture if the
 * database is unreachable). Never returns health data.
 */
import { NextResponse, type NextRequest } from "next/server";
import { loadJourney } from "@/components/journey/data";
import { corsHeaders } from "../_lib/cors";
import { buildTodayPayload } from "../_lib/payload";

export const runtime = "nodejs";
// "Today" is resolved per request in America/New_York; never cache this at
// the Next data-cache layer. CDN freshness is governed by Cache-Control below.
export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const view = await loadJourney();
  return NextResponse.json(buildTodayPayload(view), {
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
