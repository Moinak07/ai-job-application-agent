import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <main className="flex-1">
        <div className="flex h-16 items-center border-b border-zinc-700 bg-zinc-900 px-6">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-lg font-semibold text-zinc-100">Dashboard</h1>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
