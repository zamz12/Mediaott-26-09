import * as argon2 from "argon2";

// Kept separate from src/lib/auth.ts so registration/service code (and
// tests) never has to import the full NextAuth instance just to hash a
// password (Section 31).
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
