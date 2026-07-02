export type PicklistUser = {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
};

export function userDisplayName(user: PicklistUser | { displayName: string | null; username: string }) {
  return user.displayName || user.username;
}
