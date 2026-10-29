export const DELETED_MEMBER_NAME = "Deleted member";

/** The email a deleted account is left with: unique (users.email is), on a
 * reserved domain that can never receive mail, so nobody can sign in to it
 * or reset its password, and the real address is free to sign up again. */
export function deletedAccountEmail(userId: string) {
  return `deleted-${userId}@deleted.wano.invalid`;
}
