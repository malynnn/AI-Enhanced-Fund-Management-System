const http = require('http');

const PORT = 3000;

async function fetchGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${PORT}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('--- Testing FS-006 Endpoints ---');

  console.log('\n1. Fetching Budget Categories...');
  const budgets = await fetchGet('/api/finance/budget-categories');
  console.log(`Status: ${budgets.status}`);
  console.log(JSON.stringify(budgets.body, null, 2));

  console.log('\n2. Fetching Expense Vouchers...');
  const vouchers = await fetchGet('/api/finance/expense-vouchers');
  console.log(`Status: ${vouchers.status}`);
  console.log(JSON.stringify(vouchers.body, null, 2));

  console.log('\n3. Fetching Petty Cash Ledger...');
  const pettyCash = await fetchGet('/api/finance/petty-cash');
  console.log(`Status: ${pettyCash.status}`);
  console.log(JSON.stringify(pettyCash.body, null, 2));
}

runTests().catch(console.error);
