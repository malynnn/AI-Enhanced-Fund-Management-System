const fs = require('fs');

const controllers = [
  'apps/ledger-accounts-svc/src/funds/funds.controller.ts',
  'apps/dues-collection-svc/src/dues/dues.controller.ts',
  'apps/disbursement-svc/src/disbursements/disbursements.controller.ts',
  'apps/disbursement-svc/src/repayments/repayments.controller.ts',
  'apps/disbursement-svc/src/repayments/overpayments.controller.ts',
  'apps/disbursement-svc/src/write-offs/write-offs.controller.ts',
  'apps/expense-budget-svc/src/vouchers/vouchers.controller.ts',
  'apps/expense-budget-svc/src/budget/budget.controller.ts',
  'apps/expense-budget-svc/src/petty-cash/petty-cash.controller.ts'
];

for (const file of controllers) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace Public with Roles
    content = content.replace(/@Public\(\)/g, "@Roles('Treasurer', 'Admin')");
    
    // Replace import { Public } with import { Roles }
    content = content.replace(/import\s*\{\s*Public\s*\}\s*from\s*'@bdoea-fs\/auth'/g, "import { Roles } from '@bdoea-fs/auth'");
    
    // Handle cases where both were imported
    content = content.replace(/import\s*\{\s*Roles,\s*Public\s*\}\s*from\s*'@bdoea-fs\/auth'/g, "import { Roles } from '@bdoea-fs/auth'");
    content = content.replace(/import\s*\{\s*Public,\s*Roles\s*\}\s*from\s*'@bdoea-fs\/auth'/g, "import { Roles } from '@bdoea-fs/auth'");
    
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
}
