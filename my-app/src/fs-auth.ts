import { Request, Response, NextFunction } from "express";

export type FSRole =
  | "Admin"
  | "Treasurer-Finance"
  | "Internal-Auditor"
  | "LAS-Automated";


export interface MSAuthMeResponse {
  id: string;
  displayName: string;
  roles: string[]; // roles returned by MS /auth/me
}


export interface FSUser {
  msId: string;
  displayName: string;
  fsRole: FSRole;
  fsToken: string; // FS-specific JWT issued after auth
}


// Extend Express Request so downstream handlers can read req.fsUser
declare global {
  namespace Express {
    interface Request {
      fsUser?: FSUser;
    }
  }
}


// ─── Role Mapping (MS role → FS role)


const MS_TO_FS_ROLE_MAP: Record<string, FSRole> = {
  // Map your actual MS role names here
  "FS.Admin": "Admin",
  "FS.TreasurerFinance": "Treasurer-Finance",
  "FS.InternalAuditor": "Internal-Auditor",
  "FS.LASAutomated": "LAS-Automated",
};


function mapMSRoleToFSRole(msRoles: string[]): FSRole | null {
  for (const msRole of msRoles) {
    const fsRole = MS_TO_FS_ROLE_MAP[msRole];
    if (fsRole) return fsRole;
  }
  return null; // No valid mapping → will be rejected with 403
}


// ─── MS /auth/me Validation


const MS_AUTH_ME_URL =
  process.env.MS_AUTH_ME_URL ?? "https://membership-system.internal/auth/me";


async function validateMSToken(
  bearerToken: string
): Promise<MSAuthMeResponse> {
  const response = await fetch(MS_AUTH_ME_URL, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
  });


  if (!response.ok) {
    throw new Error(
      `MS /auth/me rejected token: ${response.status} ${response.statusText}`
    );
  }


  const data = (await response.json()) as MSAuthMeResponse;
  return data;
}


// ─── FS JWT Issuer
// Replace with your actual JWT library (e.g. jsonwebtoken / jose)


import jwt from "jsonwebtoken";


const FS_JWT_SECRET = process.env.FS_JWT_SECRET ?? "change-me-in-production";
const FS_JWT_EXPIRES_IN = "8h";


export function issueFSToken(user: Omit<FSUser, "fsToken">): string {
  return jwt.sign(
    {
      sub: user.msId,
      name: user.displayName,
      role: user.fsRole,
    },
    FS_JWT_SECRET,
    { expiresIn: FS_JWT_EXPIRES_IN }
  );
}


// ─── Role-Permission Guards


const ROLE_PERMISSIONS: Record<FSRole, string[]> = {
  Admin: ["read", "write", "disburse", "audit"],
  "Treasurer-Finance": ["read", "write", "disburse"],
  "Internal-Auditor": ["read"], // read-only
  "LAS-Automated": ["disburse"], // disbursement posting only
};


export function hasPermission(role: FSRole, action: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}


// ─── Audit Logger


export interface FSAuditEntry {
  timestamp: string;
  userId: string;
  role: FSRole;
  action: string;
  resource: string;
  statusCode: number;
}


// Swap this out for your DB/logger of choice
export async function logToFSAudit(entry: FSAuditEntry): Promise<void> {
  // TODO: INSERT INTO fs_audit_log VALUES (...)
  console.log("[fs_audit_log]", JSON.stringify(entry));
}


// ─── Main Auth Middleware (FS-001)


/**
 * Middleware that:
 * 1. Extracts the MS JWT from the Authorization header
 * 2. Validates it against MS /auth/me
 * 3. Maps the MS role to an FS role
 * 4. Rejects unmapped roles with 403 Forbidden
 * 5. Issues an FS-specific JWT and attaches fsUser to the request
 */
export async function fsSSOAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;


  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }


  const msToken = authHeader.slice("Bearer ".length);


  let msUser: MSAuthMeResponse;
  try {
    msUser = await validateMSToken(msToken);
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired MS token" });
    return;
  }


  const fsRole = mapMSRoleToFSRole(msUser.roles);


  // Task 3 – Reject requests from MS roles not mapped to FS roles → 403
  if (!fsRole) {
    res.status(403).json({
      error: "Forbidden: your MS role is not authorized to access this system",
    });
    return;
  }


  const fsUser: FSUser = {
    msId: msUser.id,
    displayName: msUser.displayName,
    fsRole,
    fsToken: issueFSToken({
      msId: msUser.id,
      displayName: msUser.displayName,
      fsRole,
    }),
  };


  req.fsUser = fsUser;


  // Audit every authenticated FS action
  await logToFSAudit({
    timestamp: new Date().toISOString(),
    userId: fsUser.msId,
    role: fsUser.fsRole,
    action: req.method,
    resource: req.path,
    statusCode: res.statusCode,
  });


  next();
}


// ─── Permission Guard Middleware Factory


/**
 * Use after fsSSOAuthMiddleware to restrict a route to specific actions.
 *
 * @example
 * router.post("/disburse", fsSSOAuthMiddleware, requirePermission("disburse"), handler)
 */
export function requirePermission(action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.fsUser?.fsRole;


    if (!role || !hasPermission(role, action)) {
      res.status(403).json({
        error: `Forbidden: role '${role}' cannot perform '${action}'`,
      });
      return;
    }


    next();
  };
}
