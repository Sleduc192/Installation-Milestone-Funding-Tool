import { redirect } from "next/navigation";
import AppSidebar from "@/components/app-sidebar";
import { getWorkspaceUser } from "@/lib/workspace-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getWorkspaceUser();
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") redirect("/login");
    throw error;
  }
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
