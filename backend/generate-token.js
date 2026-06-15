const jwt = require('jsonwebtoken');

const payload = {
  userId: 'mock-id-123',
  email: 'admin@bdoea.com',
  role: 'Officer/Admin'
};

const token = jwt.sign(payload, "your_jwt_secret_here", { expiresIn: '1h' });
console.log(token);
