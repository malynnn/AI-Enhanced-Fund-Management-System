import express, { Request, Response } from 'express';
import { fsSSOAuthMiddleware } from './fs-auth';

const app = express();
app.use(express.json());

// Gumawa tayo ng dummy route na protektado ng middleware mo
app.get('/api/protected', fsSSOAuthMiddleware, (req: Request, res: Response) => {
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
