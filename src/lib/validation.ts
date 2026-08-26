import { z } from "zod";

export type ActionState = { error?: string };

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const travellerSignupSchema = z.object({
  role: z.literal("traveller"),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export const vendorSignupSchema = z.object({
  role: z.literal("vendor"),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  businessName: z.string().min(2).max(120),
  location: z.string().min(2).max(120),
  description: z.string().min(10).max(600),
});

export const signupSchema = z.discriminatedUnion("role", [
  travellerSignupSchema,
  vendorSignupSchema,
]);

export const offerEditSchema = z.object({
  listingId: z.string().uuid(),
  discountText: z.string().min(3).max(200),
  freebieText: z.string().max(200).optional().or(z.literal("")),
  active: z.coerce.boolean(),
});
