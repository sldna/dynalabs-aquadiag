import { NextRequest, NextResponse } from "next/server";

import { serverFetchBase } from "@/lib/api-base";

export const dynamic = "force-dynamic";

function validateSegments(parts: string[]): boolean {
  for (const p of parts) {
    if (p === "" || p === "." || p === "..") {
      return false;
    }
  }
  return true;
}

async function proxy(
  req: NextRequest,
  pathParts: string[],
): Promise<NextResponse> {
  if (pathParts.length === 0 || !validateSegments(pathParts)) {
    return NextResponse.json(
      { code: "bad_path", message: "Ungültiger API-Pfad" },
      { status: 400 },
    );
  }

  const pathStr = pathParts.join("/");
  const base = serverFetchBase();
  const target = `${base}/${pathStr}${req.nextUrl.search}`;

  const headers = new Headers();
  const ct = req.headers.get("content-type");
  if (ct) {
    headers.set("content-type", ct);
  }

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const init: RequestInit = {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    signal: AbortSignal.timeout(120_000),
  };

  let res: Response;
  try {
    res = await fetch(target, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json(
      { code: "upstream_error", message: msg },
      { status: 502 },
    );
  }

  const outHeaders = new Headers();
  const outCt = res.headers.get("content-type");
  if (outCt) {
    outHeaders.set("content-type", outCt);
  }

  // Per fetch spec, 204/205/304 responses must not carry a body. Constructing
  // a NextResponse with a (even empty) body would throw "Invalid response
  // status code 204".
  if (isNullBodyStatus(res.status)) {
    return new NextResponse(null, {
      status: res.status,
      headers: outHeaders,
    });
  }

  return new NextResponse(await res.arrayBuffer(), {
    status: res.status,
    headers: outHeaders,
  });
}

function isNullBodyStatus(status: number): boolean {
  return status === 204 || status === 205 || status === 304;
}

type RouteCtx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function OPTIONS(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
