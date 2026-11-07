import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "MANAGER" | "TENANT";
  }
  interface Session {
    user: { id: string; role: "MANAGER" | "TENANT" } & DefaultSession["user"];
  }
}
