import { LoginForm } from "./login-form";

export default function LoginPage() {
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Sign in to PropManager</h1>
      <LoginForm />
      {isDev && (
        <p className="rounded border border-dashed p-3 text-xs text-gray-600">
          Development accounts (from the seed script): manager@example.com or
          avery@example.com, password ChangeMe123!
        </p>
      )}
    </main>
  );
}
