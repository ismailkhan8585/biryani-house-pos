import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuth();
  if (auth) redirect(auth.role === "admin" ? "/admin" : "/pos");
  return children;
}
