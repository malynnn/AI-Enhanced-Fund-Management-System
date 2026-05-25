"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_auth_1 = require("./fs-auth");
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Gumawa tayo ng dummy route na protektado ng middleware mo
app.get('/api/protected', fs_auth_1.fsSSOAuthMiddleware, (req, res) => {
    res.status(200).json({
        message: "Success! Nakapasok ka sa protected route.",
        userData: req.fsUser // Ito yung dinagdag ng middleware mo kung tama ang token
    });
});
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`\n✅ Test Server is running!`);
    console.log(`➡ Pwede mo nang i-test sa Postman: http://localhost:${PORT}/api/protected\n`);
});
