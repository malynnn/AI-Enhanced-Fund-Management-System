"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueFSToken = issueFSToken;
exports.hasPermission = hasPermission;
exports.logToFSAudit = logToFSAudit;
exports.fsSSOAuthMiddleware = fsSSOAuthMiddleware;
exports.requirePermission = requirePermission;
// ─── Role Mapping (MS role → FS role)
const MS_TO_FS_ROLE_MAP = {
    // Map your actual MS role names here
    "FS.Admin": "Admin",
    "FS.TreasurerFinance": "Treasurer-Finance",
    "FS.InternalAuditor": "Internal-Auditor",
    "FS.LASAutomated": "LAS-Automated",
};
function mapMSRoleToFSRole(msRoles) {
    for (const msRole of msRoles) {
        const fsRole = MS_TO_FS_ROLE_MAP[msRole];
        if (fsRole)
            return fsRole;
    }
    return null; // No valid mapping → will be rejected with 403
}
// ─── MS /auth/me Validation
const MS_AUTH_ME_URL = process.env.MS_AUTH_ME_URL ?? "https://membership-system.internal/auth/me";
async function validateMSToken(bearerToken) {
    // --- MOCK IMPLEMENTATION START ---
    // Since MS /auth/me is not yet integrated, we mock the response based on the token
    const USE_MOCK = process.env.USE_MOCK_MS !== "false";
    if (USE_MOCK) {
        if (bearerToken === "mock-admin-token") {
            return { id: "u1", displayName: "Mock Admin", roles: ["FS.Admin"] };
        }
        else if (bearerToken === "mock-treasurer-token") {
            return { id: "u2", displayName: "Mock Treasurer", roles: ["FS.TreasurerFinance"] };
        }
        else if (bearerToken === "mock-auditor-token") {
            return { id: "u3", displayName: "Mock Auditor", roles: ["FS.InternalAuditor"] };
        }
        else if (bearerToken === "mock-unauthorized-token") {
            return { id: "u4", displayName: "Mock User", roles: ["Other.Role"] };
        }
        else if (bearerToken === "mock-invalid-token") {
            throw new Error("MS /auth/me rejected token: 401 Unauthorized");
        }
        // Default mock behavior
        return {
            id: "mock-user-default",
            displayName: "Default Mock User",
            roles: ["FS.Admin"],
        };
    }
    // --- MOCK IMPLEMENTATION END ---
    const response = await fetch(MS_AUTH_ME_URL, {
        headers: {
            Authorization: `Bearer ${bearerToken}`,
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        throw new Error(`MS /auth/me rejected token: ${response.status} ${response.statusText}`);
    }
    const data = (await response.json());
    return data;
}
// ─── FS JWT Issuer
// Replace with your actual JWT library (e.g. jsonwebtoken / jose)
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const FS_JWT_SECRET = process.env.FS_JWT_SECRET ?? "change-me-in-production";
const FS_JWT_EXPIRES_IN = "8h";
function issueFSToken(user) {
    return jsonwebtoken_1.default.sign({
        sub: user.msId,
        name: user.displayName,
        role: user.fsRole,
    }, FS_JWT_SECRET, { expiresIn: FS_JWT_EXPIRES_IN });
}
// ─── Role-Permission Guards
const ROLE_PERMISSIONS = {
    Admin: ["read", "write", "disburse", "audit"],
    "Treasurer-Finance": ["read", "write", "disburse"],
    "Internal-Auditor": ["read"], // read-only
    "LAS-Automated": ["disburse"], // disbursement posting only
};
function hasPermission(role, action) {
    return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}
// Swap this out for your DB/logger of choice
async function logToFSAudit(entry) {
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
async function fsSSOAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or malformed Authorization header" });
        return;
    }
    const msToken = authHeader.slice("Bearer ".length);
    let msUser;
    try {
        msUser = await validateMSToken(msToken);
    }
    catch (err) {
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
    const fsUser = {
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
function requirePermission(action) {
    return (req, res, next) => {
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
