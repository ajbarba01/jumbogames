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

// Owner is env-only and never assignable here; the UI toggles player/admin.
export const roleChangeSchema = z.object({
  role: z.enum(["player", "admin"]),
});

export type RoleChange = z.infer<typeof roleChangeSchema>;
