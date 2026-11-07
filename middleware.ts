import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const session = req.auth;
  const path = req.nextUrl.pathname;

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (path.startsWith("/manager") && session.user.role !== "MANAGER") {
    return NextResponse.redirect(new URL("/tenant", req.nextUrl));
  }

  if (path.startsWith("/tenant") && session.user.role !== "TENANT") {
    return NextResponse.redirect(new URL("/manager", req.nextUrl));
  }
});

export const config = {
  matcher: ["/manager/:path*", "/tenant/:path*"],
};
