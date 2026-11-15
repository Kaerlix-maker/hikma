import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const mode = sp.mode === "signup" ? "signup" : "signin";
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        {sp.error === "confirm" && <p className="mb-4 text-center text-sm text-danger">That confirmation link is invalid or expired.</p>}
        <div className="card p-6 shadow-2xl shadow-black/50"><LoginForm initialMode={mode} next={next} /></div>
      </div>
    </div>
  );
}
