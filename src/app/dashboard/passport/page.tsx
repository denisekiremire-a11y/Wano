import { redirect } from "next/navigation";

export default function PassportRedirect() {
  redirect("/profile?tab=passport");
}
