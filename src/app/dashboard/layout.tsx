import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { signOut } from "@/app/login/actions";
import { supabaseUser } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const sb = await supabaseUser();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Logo href="/dashboard" />
          <form action={signOut} className="flex items-center gap-2 text-sm">
            <span className="hidden font-mono text-xs text-muted sm:inline">{user.email}</span>
            <button className="btn-ghost h-8 px-3">Log out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
