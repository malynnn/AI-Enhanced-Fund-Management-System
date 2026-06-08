const fs = require('fs');

// Revert funds/page.tsx
let f = 'app/finance/funds/page.tsx';
let c = fs.readFileSync(f, 'utf8');
c = c.replace("import { useSession } from 'next-auth/react';\n", '');
c = c.replace("  const { data: session, status } = useSession();\n\n", '');
c = c.replace("  const fetchRealFundsData = async (token: string) => {", "  const fetchRealFundsData = async () => {");
c = c.replace("      const res = await fetch(`${gatewayUrl}/api/finance/funds`, {\n        headers: { 'Authorization': `Bearer ${token}` }\n      });", "      const res = await fetch(`${gatewayUrl}/api/finance/funds`);");
c = c.replace("  useEffect(() => {\n    if (status === 'authenticated' && session) {\n      fetchRealFundsData((session as any).accessToken);\n    }\n  }, [status, session]);", "  useEffect(() => {\n    fetchRealFundsData();\n  }, []);");
fs.writeFileSync(f, c);
console.log('Reverted funds/page.tsx');
