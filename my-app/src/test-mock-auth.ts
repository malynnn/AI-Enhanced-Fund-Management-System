import { fsSSOAuthMiddleware } from "./fs-auth";
import { Request, Response } from "express";

async function runTests() {
  console.log("--- Testing Mock MS /auth/me Integration ---\n");

  const runTest = async (tokenName: string, tokenValue: string) => {
    console.log(`Testing token: ${tokenName}`);
    
    const req = {
      headers: {
        authorization: `Bearer ${tokenValue}`
      },
      method: "GET",
      path: "/api/test",
    } as unknown as Request;

    const res = {
      statusCode: 200,
      status: function(code: number) {
        (this as any).statusCode = code;
        return this;
      },
      json: function(data: any) {
        console.log(`  -> Response [${(this as any).statusCode}]:`, data);
        return this;
      }
    } as unknown as Response;

    const next = () => {
      console.log(`  -> next() called successfully!`);
      console.log(`  -> fsUser attached to req:`, req.fsUser);
    };

    await fsSSOAuthMiddleware(req, res, next);
    console.log("--------------------------------------------------\n");
  };

  await runTest("Admin Token", "mock-admin-token");
  await runTest("Treasurer Token", "mock-treasurer-token");
  await runTest("Auditor Token", "mock-auditor-token");
  await runTest("Unauthorized Token (Role not mapped)", "mock-unauthorized-token");
  await runTest("Invalid Token", "mock-invalid-token");
  await runTest("No Token", "");
}

runTests().catch(console.error);
