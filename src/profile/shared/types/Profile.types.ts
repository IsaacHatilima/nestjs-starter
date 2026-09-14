/** The public shape of a user's profile. Carried inside `User`, and returned on its own by the update flow. */
export interface Profile {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

/** The fields an update may change. An absent key leaves the column alone; `avatarUrl: null` clears it. */
export interface ProfileChanges {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
}
