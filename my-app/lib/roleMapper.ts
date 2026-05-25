import { NextResponse } from "next/server";

// define exact MS to FS role mappings here. adjust MS string keys to match what MS payload sends
const MS_TO_FS_ROLE_MAP: Record<string, string> = {
  "MS_Admin": "Superadmin",
  "MS_President": "Officer/Admin",
  "MS_Treasurer": "Treasurer",
  "MS_Auditor": "Auditor",
  "MS_Member": "User",
};

// validates an incoming MS role and returns either a 403 error response or the mapped FS role.
export function validateCrossSystemRole(incomingMsRole: string | null | undefined) {
  if (!incomingMsRole) {
    return { 
      errorResponse: NextResponse.json({ error: "401 Unauthorized: No role provided in request." }, { status: 401 }), 
      fsRole: null 
    };
  }

  const mappedFsRole = MS_TO_FS_ROLE_MAP[incomingMsRole];

  // reject unmapped roles with 403 forbidden
  if (!mappedFsRole) {
    return { 
      errorResponse: NextResponse.json({ 
        error: `403 Forbidden: The Membership System role '${incomingMsRole}' is not mapped to any Financial System access level.` 
      }, { status: 403 }), 
      fsRole: null 
    };
  }

  // success: return the mapped role
  return { errorResponse: null, fsRole: mappedFsRole };
}