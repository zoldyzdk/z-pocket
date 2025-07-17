import * as schema from '@/db/schema';
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthClient } from "better-auth/react";
import { db } from "../db";

const { usersTable, sessions, accounts, verifications } = schema;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      users: usersTable,
      sessions: sessions,
      accounts: accounts,
      verifications: verifications,
    },
  }),
  user: {
    additionalFields: {
      id: {
        type: 'string',
        defaultValue: () => crypto.randomUUID(),
      }
    }
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
})


export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
});

export const { signIn, signOut, signUp, useSession } = authClient;
