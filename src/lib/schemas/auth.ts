/**
 * Shared Zod schemas for auth and role-change request bodies. Parsed at the
 * route boundary before any handler logic runs.
 */
import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
});

export type Credentials = z.infer<typeof credentialsSchema>;

// Display names are cosmetic: 1–30 chars, trimmed, not unique. Shared by the
// signup route (via user metadata) and the self-only profile PATCH route.
export const displayNameSchema = z.string().trim().min(1).max(30);

export const signupSchema = credentialsSchema.extend({
  displayName: displayNameSchema,
});

export type Signup = z.infer<typeof signupSchema>;

// Owner is env-only and never assignable here; the UI toggles player/admin.
export const roleChangeSchema = z.object({
  role: z.enum(["player", "admin"]),
});

export type RoleChange = z.infer<typeof roleChangeSchema>;
