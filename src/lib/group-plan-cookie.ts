import { cookies } from "next/headers";

// Set when a plan's maker taps "Book for the group": the next booking they
// make at that plan's place brings the plan's "going" friends along.
export const GROUP_PLAN_COOKIE = "wano_group_plan";
export const GROUP_PLAN_COOKIE_MAX_AGE = 60 * 60;

/** The plan id from the cookie, cleared so it is used once. */
export async function takeGroupPlanId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(GROUP_PLAN_COOKIE)?.value ?? null;
  if (value) store.delete(GROUP_PLAN_COOKIE);
  return value;
}

export async function peekGroupPlanId(): Promise<string | null> {
  return (await cookies()).get(GROUP_PLAN_COOKIE)?.value ?? null;
}
