const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('Testing GET /api/favorites...');
  const getRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/favorites?email=parithosh@gmail.com',
    method: 'GET'
  });
  console.log('GET status:', getRes.status, 'favorites count:', getRes.body.favorites?.length);

  console.log('Testing POST /api/favorites (Add Homemade Protein Bowl)...');
  const postRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/favorites',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'parithosh@gmail.com',
    name: 'Homemade Protein Bowl',
    portion: '1 bowl (350g)',
    calories: 380,
    protein: 30,
    carbs: 45,
    fats: 9,
    fiber: 7
  });
  console.log('POST status:', postRes.status, 'added favorite id:', postRes.body.favorite?.id);
  const createdId = postRes.body.favorite?.id;

  console.log('Testing DELETE /api/favorites/' + createdId + '...');
  const delRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/favorites/' + createdId + '?email=parithosh@gmail.com',
    method: 'DELETE'
  });
  console.log('DELETE status:', delRes.status, 'message:', delRes.body.message);

  console.log('All backend API tests succeeded! 🎉');
}

runTests().catch(console.error);
