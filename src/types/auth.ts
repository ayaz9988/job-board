export type UserRole = "admin" | "employer" | "seeker";

// Minimal shape of the authenticated user attached to every request.
// Matches better-auth's session.user plus our custom `role` field.
export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole | string;
  profile?: string | null;
  location?: string | null;
}
