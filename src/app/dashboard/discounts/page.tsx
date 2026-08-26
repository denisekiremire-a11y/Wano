import { redirect } from "next/navigation";

export default function DiscountsRedirect() {
  redirect("/profile?tab=deals");
}
