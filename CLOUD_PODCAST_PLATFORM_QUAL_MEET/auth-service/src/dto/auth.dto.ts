import { z } from "zod";

// Signup request schema
export const SignupSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
});

// Login request schema
export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// DTOs inferred from schemas
export type SignupRequestDTO = z.infer<typeof SignupSchema>;
export type LoginRequestDTO = z.infer<typeof LoginSchema>;
