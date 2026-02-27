import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "./db";
import User from "./models/User";
import School from "./models/School";
import Role from "./models/Role";
import { audit } from "./audit";

export interface MenuPermissionData {
  menu: string;
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const { email, password } = credentials;

        try {
          await connectDB();

          // Find user by email, include password + lockout fields
          const user = await User.findOne({
            email: email.toLowerCase(),
            isActive: true,
          }).select("+password +failedLoginAttempts +lockedUntil");

          if (!user) {
            throw new Error("Invalid email or password");
          }

          // Check account lockout
          if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
            const minutesLeft = Math.ceil(
              (new Date(user.lockedUntil).getTime() - Date.now()) / 60000,
            );
            throw new Error(
              `Account locked. Try again in ${minutesLeft} minute(s)`,
            );
          }

          // Verify password with bcrypt
          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
            // Increment failed attempts
            const attempts = (user.failedLoginAttempts || 0) + 1;
            const updateFields: Record<string, unknown> = {
              failedLoginAttempts: attempts,
            };

            if (attempts >= MAX_LOGIN_ATTEMPTS) {
              updateFields.lockedUntil = new Date(
                Date.now() + LOCKOUT_DURATION_MS,
              );
            }

            await User.updateOne({ _id: user._id }, { $set: updateFields });

            if (attempts >= MAX_LOGIN_ATTEMPTS) {
              throw new Error(
                `Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts. Try again in 15 minutes`,
              );
            }

            throw new Error(
              `Invalid email or password. ${MAX_LOGIN_ATTEMPTS - attempts} attempt(s) remaining`,
            );
          }

          // Check email verification
          if (!user.emailVerified) {
            throw new Error(
              "Please verify your email before logging in. Check your inbox for the verification link.",
            );
          }

          // Successful login: reset lockout counters
          await User.updateOne(
            { _id: user._id },
            {
              $set: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lastLoginAt: new Date(),
              },
            },
          );

          // Audit log the successful login (fire-and-forget)
          audit({
            action: "login",
            entity: "user",
            entityId: user._id.toString(),
            schoolId: user.school ? user.school.toString() : "",
            userId: user._id.toString(),
            userName: user.name,
            userRole: user.role,
            metadata: { email: user.email },
          }).catch(() => {});

          // Get school info
          const schoolId = user.school ? user.school.toString() : "";

          // Load school for plan info
          const school = await School.findById(user.school);
          let subscriptionStatus = school?.subscriptionStatus || "trial";

          // Check trial expiry
          if (
            subscriptionStatus === "trial" &&
            school?.trialEndsAt &&
            new Date(school.trialEndsAt) < new Date()
          ) {
            subscriptionStatus = "expired";
            await School.findByIdAndUpdate(user.school, {
              subscriptionStatus: "expired",
            });
          }

          return {
            id: user._id.toString(),
            school_id: schoolId,
            school_name: school?.school_name || "",
            name: user.name,
            email: user.email,
            role: user.role,
            plan: school?.plan || "starter",
            subscriptionStatus,
            allowedModules: user.allowedModules || [],
            customRole: user.customRole ? user.customRole.toString() : "",
            menuPermissions: [],
          };

          // Note: menuPermissions will be loaded in the jwt callback
          // to keep the authorize function fast
        } catch (error) {
          // Auth error logged via structured logger
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.school_id = user.school_id;
        token.school_name = user.school_name;
        token.role = user.role;
        token.name = user.name;
        token.plan = user.plan;
        token.subscriptionStatus = user.subscriptionStatus;
        token.allowedModules = user.allowedModules;
        token.customRole = user.customRole || "";
        token.menuPermissions = [];

        // Load menu permissions from custom role
        if (user.customRole) {
          try {
            await connectDB();
            const role = await Role.findById(user.customRole).lean();
            if (role && role.isActive) {
              token.menuPermissions = (role.permissions || []).map((p) => ({
                menu: p.menu,
                view: p.view,
                add: p.add,
                edit: p.edit,
                delete: p.delete,
              }));
            }
          } catch (e) {
            // Role permissions load failed — continue with empty permissions
          }
        }
      }
      // Re-fetch plan on session update (e.g. after subscription change)
      if (trigger === "update" && token.school_id) {
        try {
          await connectDB();
          const school = await School.findById(token.school_id);
          if (school) {
            token.plan = school.plan;
            let subStatus = school.subscriptionStatus;
            if (
              subStatus === "trial" &&
              school.trialEndsAt &&
              new Date(school.trialEndsAt) < new Date()
            ) {
              subStatus = "expired";
              await School.findByIdAndUpdate(school._id, {
                subscriptionStatus: "expired",
              });
            }
            token.subscriptionStatus = subStatus;
          }
          const userDoc = await User.findById(token.id);
          if (userDoc) {
            token.allowedModules = userDoc.allowedModules || [];
            token.customRole = userDoc.customRole
              ? userDoc.customRole.toString()
              : "";

            // Reload menu permissions from custom role
            if (userDoc.customRole) {
              const role = await Role.findById(userDoc.customRole).lean();
              if (role && role.isActive) {
                token.menuPermissions = (role.permissions || []).map((p) => ({
                  menu: p.menu,
                  view: p.view,
                  add: p.add,
                  edit: p.edit,
                  delete: p.delete,
                }));
              } else {
                token.menuPermissions = [];
              }
            } else {
              token.menuPermissions = [];
            }
          }
        } catch (e) {
          // Session update failed — continue with cached values
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Validate that school_id is a valid MongoDB ObjectId
        // Old sessions from Google Sheets era will have invalid IDs like "SCH001"
        const schoolId = token.school_id as string;
        if (schoolId && !mongoose.Types.ObjectId.isValid(schoolId)) {
          // Force re-authentication by returning empty session
          session.user.id = "";
          session.user.school_id = "";
          session.user.school_name = "";
          session.user.role = "";
          session.user.name = "";
          return session;
        }
        session.user.id = token.id as string;
        session.user.school_id = schoolId;
        session.user.school_name = (token.school_name as string) || "";
        session.user.role = token.role as string;
        session.user.name = token.name as string;
        session.user.plan = (token.plan as string) || "starter";
        session.user.subscriptionStatus =
          (token.subscriptionStatus as string) || "trial";
        session.user.allowedModules = (token.allowedModules as string[]) || [];
        session.user.customRole = (token.customRole as string) || "";
        session.user.menuPermissions =
          (token.menuPermissions as MenuPermissionData[]) || [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Centralized auth helper. Returns a valid session or null.
 * Validates that school_id is a valid MongoDB ObjectId — rejects stale/old sessions.
 */
export async function getAuthSession() {
  const { getServerSession } = await import("next-auth");
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  // Reject sessions with empty or invalid school_id (legacy Google Sheets sessions)
  const sid = session.user.school_id;
  if (!sid || !mongoose.Types.ObjectId.isValid(sid)) return null;
  return session;
}

// Re-export requireAuth from permissions for convenience
export {
  requireAuth,
  requireRole,
  hasPermission,
  getPermissions,
} from "./permissions";

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      school_id: string;
      school_name: string;
      name: string;
      email: string;
      role: string;
      plan: string;
      subscriptionStatus: string;
      allowedModules: string[];
      customRole: string;
      menuPermissions: MenuPermissionData[];
    };
  }

  interface User {
    id: string;
    school_id: string;
    school_name: string;
    name: string;
    email: string;
    role: string;
    plan: string;
    subscriptionStatus: string;
    allowedModules: string[];
    customRole: string;
    menuPermissions: MenuPermissionData[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    school_id: string;
    school_name: string;
    role: string;
    name: string;
    plan: string;
    subscriptionStatus: string;
    allowedModules: string[];
    customRole: string;
    menuPermissions: MenuPermissionData[];
  }
}
