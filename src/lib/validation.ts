import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Mínimo 3 caracteres")
  .max(20, "Máximo 20 caracteres")
  .regex(/^[a-z0-9._]+$/, "Solo letras, números, punto y guion bajo")
  .refine((v) => !v.startsWith(".") && !v.endsWith(".") && !v.includes(".."), {
    message: "El punto no puede ir al principio, al final ni repetido",
  });

export const profileSchema = z.object({
  username: usernameSchema,
  full_name: z.string().trim().min(1, "Escribe tu nombre").max(50, "Máximo 50 caracteres"),
  bio: z
    .string()
    .trim()
    .max(160, "Máximo 160 caracteres")
    .transform((v) => v || null),
  avatar_url: z
    .url()
    .max(500)
    .nullable()
    .or(z.literal("").transform(() => null)),
  timezone: z.string().min(1).max(64),
});

export type ProfileInput = z.input<typeof profileSchema>;

export const credentialsSchema = z.object({
  email: z.string().trim().pipe(z.email("Email no válido")),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});
