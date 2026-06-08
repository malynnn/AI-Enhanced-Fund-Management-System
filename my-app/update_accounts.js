const fs = require('fs');
const file = 'app/finance/config/accounts/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('const { data: session } = useSession();', 'const { data: session, status } = useSession();');

content = content.replace(
  'const fetchAccounts = async () => {\n    try {\n      setIsLoading(true);\n      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || \http://localhost:3000\;\n      const res = await fetch(\/api/finance/accounts);',
  'const fetchAccounts = async (token: string) => {\n    try {\n      setIsLoading(true);\n      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || \http://localhost:3000\;\n      const res = await fetch(\/api/finance/accounts, {\n        headers: { \'Authorization\': \Bearer \\ }\n      });'
);

content = content.replace(
  'useEffect(() => {\n    fetchAccounts();\n  }, []);',
  'useEffect(() => {\n    if (status === \'authenticated\' && session) {\n      fetchAccounts((session as any).accessToken);\n    }\n  }, [status, session]);'
);

content = content.replace(
  'const res = await fetch(/api/finance/accounts/\, {\n        method: \'PATCH\',\n        headers: { \'Content-Type\': \'application/json\' },',
  'const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || \http://localhost:3000\;\n      const res = await fetch(\/api/finance/accounts/\, {\n        method: \'PATCH\',\n        headers: { \n          \'Content-Type\': \'application/json\',\n          \'Authorization\': \Bearer \\\n        },'
);

content = content.replace(
  'const url = editingId ? /api/finance/accounts/\ : \'/api/finance/accounts\';\n      const method = editingId ? \'PUT\' : \'POST\';\n      \n      const res = await fetch(url, {\n        method,\n        headers: { \'Content-Type\': \'application/json\' },',
  'const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || \http://localhost:3000\;\n      const url = editingId ? \/api/finance/accounts/\ : \/api/finance/accounts;\n      const method = editingId ? \'PUT\' : \'POST\';\n      \n      const res = await fetch(url, {\n        method,\n        headers: { \n          \'Content-Type\': \'application/json\',\n          \'Authorization\': \Bearer \\\n        },'
);

fs.writeFileSync(file, content);
console.log('Update successful');
