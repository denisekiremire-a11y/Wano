import { redirect } from "next/navigation";

export default function ChallengesRedirect() {
  redirect("/profile?tab=challenges");
}
