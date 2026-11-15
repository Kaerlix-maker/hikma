"use client";
import { useActionState } from "react";
import { createAssistant } from "./actions";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function NewAssistant({ first }: { first: boolean }) {
  const [state, action] = useActionState(createAssistant, null);
  return (
    <form action={action} className="flex flex-col justify-between gap-3 rounded-xl border border-dashed border-border-strong p-5">
      <div>
        <h2 className="font-medium">{first ? "Create your first assistant" : "New assistant"}</h2>
        <p className="text-sm text-muted">Name it after your business.</p>
      </div>
      <input name="name" required minLength={2} maxLength={80} placeholder="Business name" aria-label="Business name" className="input" />
      <FormMessage error={state?.error} />
      <SubmitButton className="btn-primary w-full">Create assistant</SubmitButton>
    </form>
  );
}
