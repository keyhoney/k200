import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppNav from "@/components/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let authed = false;
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    authed = !!data.user;
  } catch {
    authed = false;
  }
  if (!authed) redirect("/login");
  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <AppNav />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
