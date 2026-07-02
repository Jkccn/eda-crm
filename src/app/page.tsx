import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { modulesForRole } from "@/lib/rbac";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const modules = modulesForRole(user.role);
  if (modules.includes("customers")) redirect("/customers");
  if (modules.includes("support")) redirect("/support");
  if (modules.includes("dashboard")) redirect("/dashboard");
  redirect("/login");
}
