"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_auth_1 = require("./fs-auth");
async function runTests() {
    console.log("--- Testing Mock MS /auth/me Integration ---\n");
    const runTest = async (tokenName, tokenValue) => {
        console.log(`Testing token: ${tokenName}`);
        const req = {
            headers: {
                authorization: `Bearer ${tokenValue}`
            },
            method: "GET",
            path: "/api/test",
        };
        const res = {
            statusCode: 200,
            status: function (code) {
                this.statusCode = code;
                return this;
            },
            json: function (data) {
                console.log(`  -> Response [${this.statusCode}]:`, data);
                return this;
            }
        };
        const next = () => {
            console.log(`  -> next() called successfully!`);
            console.log(`  -> fsUser attached to req:`, req.fsUser);
        };
        await (0, fs_auth_1.fsSSOAuthMiddleware)(req, res, next);
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
