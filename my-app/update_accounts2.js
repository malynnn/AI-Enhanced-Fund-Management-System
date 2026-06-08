const fs = require('fs');
const file = 'app/finance/config/accounts/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const \{ data: session \} = useSession\(\);/g, 'const { data: session, status } = useSession();');

content = content.replace(/const fetchAccounts = async \(\) => \{/g, 'const fetchAccounts = async (token: string) => {');

content = content.replace(/const res = await fetch\(\$\{gatewayUrl\}\/api\/finance\/accounts\);/g, "const res = await fetch(\\/api/finance/accounts\, { headers: { 'Authorization': \Bearer \\ } });");

content = content.replace(/useEffect\(\(\) => \{\s*fetchAccounts\(\);\s*\}, \[\]\);/g, "useEffect(() => { if (status === 'authenticated' && session) { fetchAccounts((session as any).accessToken); } }, [status, session]);");

content = content.replace(/const res = await fetch\(\/api\/finance\/accounts\/\$\{id\},\s*\{\s*method: 'PATCH',\s*headers: \{ 'Content-Type': 'application\/json' \},/g, "const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000';\n      const res = await fetch(\\/api/finance/accounts/\\, {\n        method: 'PATCH',\n        headers: { 'Content-Type': 'application/json', 'Authorization': \Bearer \\ },");

content = content.replace(/const url = editingId \? \/api\/finance\/accounts\/\$\{editingId\} : '\/api\/finance\/accounts';\s*const method = editingId \? 'PUT' : 'POST';\s*const res = await fetch\(url, \{\s*method,\s*headers: \{ 'Content-Type': 'application\/json' \},/g, "const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000';\n      const url = editingId ? \\/api/finance/accounts/\\ : \\/api/finance/accounts\;\n      const method = editingId ? 'PUT' : 'POST';\n      \n      const res = await fetch(url, {\n        method,\n        headers: { 'Content-Type': 'application/json', 'Authorization': \Bearer \\ },");

fs.writeFileSync(file, content);
console.log('Update successful');
