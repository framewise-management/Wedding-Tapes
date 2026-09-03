import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('email must be an email'),
  password: z.string().min(1, 'password should not be empty'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  businessName: z.string().min(1, 'businessName should not be empty'),
  firstName: z.string().min(1, 'firstName should not be empty'),
  lastName: z.string().min(1, 'lastName should not be empty'),
  email: z.string().email('email must be an email'),
  password: z.string().min(8, 'password must be longer than or equal to 8 characters'),
});
export type SignupInput = z.infer<typeof signupSchema>;
