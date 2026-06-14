import fs from 'node:fs';
import path from 'node:path';

async function run() {
  try {
    // 1. Register a test user
    const regRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `testuser_${Date.now()}`,
        password: 'password123'
      })
    });
    const regData = await regRes.json();
    if (!regRes.ok) {
      console.log('Register failed', regData);
      return;
    }

    const token = regData.token;

    // 2. Create a dummy image
    const imgPath = path.join(process.cwd(), 'dummy.jpg');
    fs.writeFileSync(imgPath, 'dummy image content');

    // 3. Upload avatar using native fetch with FormData
    // Note: Node 18+ has fetch and FormData built-in, but since we are running via node, let's just make a manual multipart request
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="avatar"; filename="dummy.jpg"\r\n`;
    body += `Content-Type: image/jpeg\r\n\r\n`;
    body += fs.readFileSync(imgPath, 'utf8') + '\r\n';
    body += `--${boundary}--\r\n`;

    const uploadRes = await fetch('http://localhost:3000/api/auth/avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: Buffer.from(body, 'utf-8')
    });

    const uploadData = await uploadRes.json();
    console.log('Upload Status:', uploadRes.status);
    console.log('Upload Response:', uploadData);

    fs.unlinkSync(imgPath);

  } catch (err) {
    console.error(err);
  }
}

run();
