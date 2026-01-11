import z from "zod";

export const userSchema = z.object({
  _id: z.string(),
  name: z.string(),
  email: z.email(),
  password: z.string().min(6),
  role: z.enum(["admin", "supervisor", "agent", "candidate"]),
  supervisorId: z.string().optional()
});

export const userSignUpSchema = userSchema.pick({
  name: true,
  email: true,
  password: true,
  role: true,
  supervisorId: true
});

export const userLoginSchema = userSchema.pick({
  email: true,
  password: true
});

export type UserType = z.infer<typeof userSchema>;
export type UserSignUp = z.infer<typeof userSignUpSchema>;
export type UserLogIn = z.infer<typeof userLoginSchema>