import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getCurrentUserFromCookies } from "@/lib/session";

export default async function LoginPage() {
  const user = await getCurrentUserFromCookies();
  if (user) {
    redirect("/chat");
  }

  return <AuthForm mode="login" />;
}
