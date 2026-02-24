import { redirect } from "next/navigation";

import { getCurrentUserFromCookies } from "@/lib/session";

export default async function HomePage() {
  const user = await getCurrentUserFromCookies();
  redirect(user ? "/chat" : "/demo");
}
