import { NextResponse } from "next/server";
import { errorHandler, errorCodes } from "@/lib/helpers/responseHandler";

export async function middleware(req) {
  const url = req.nextUrl;

  // Only protect API routes
  if (url.pathname.startsWith("/api")) {
    const authHeader = req.headers.get("x-api-key")?.replace("Bearer ", "");
    console.log(authHeader);
    if (!authHeader || authHeader !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        errorHandler(
          "Unauthorized: Please provide a valid Internal API key.",
          errorCodes.UNAUTHORIZED
        ),
        {
          status: 401,
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"], // Only runs for API routes
};
