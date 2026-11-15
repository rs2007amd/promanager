import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "MANAGER" | "TENANT";
    sessionVersion: number;
  }
  interface Session {
    user: { id: string; role: "MANAGER" | "TENANT" } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: "MANAGER" | "TENANT";
    sessionVersion?: number;
  }
}
