import { redirect } from "next/navigation";

export default function Home() {
  // Bypassed auth for demo
  redirect("/login");
}
