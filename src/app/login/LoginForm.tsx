"use client";
import { useActionState, useState } from "react";
import { signIn, signUp } from "./actions";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm({ initialMode, next }: { initialMode: "signin" | "signup"; next?: string }) {
  const [mode, setMode] = useState(initialMode);
  const [inState, inAction] = useActionState(signIn, null);
  const [upState, upAction] = useActionState(signUp, null);
  const state = mode === "signin" ? inState : upState;

  return (
    <form action={mode === "signin" ? inAction : upAction} className="space-y-4">
      <div className="mb-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{mode === "signin" ? "Log in to Hikma" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-muted">{mode === "signin" ? "Welcome back." : "Free. No card needed."}</p>
      </div>
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="you@company.com" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"} className="input" placeholder="At least 8 characters" />
      </div>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton className="btn-primary h-10 w-full">{mode === "signin" ? "Continue" : "Create account"}</SubmitButton>
      <p className="text-center text-sm text-muted">
        {mode === "signin" ? "No account? " : "Already have an account? "}
        <button type="button" className="text-fg underline-offset-4 hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "Sign up" : "Log in"}
        </button>
      </p>
    </form>
  );
}
