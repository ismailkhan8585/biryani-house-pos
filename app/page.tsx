import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

export default async function Home() {
  const auth = await getAuth();
  if (auth) {
    redirect(auth.role === "admin" ? "/admin" : "/pos");
  } else {
    redirect("/login");
  }
}
