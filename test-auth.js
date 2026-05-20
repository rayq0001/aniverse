const { GoogleAuth } = require('google-auth-library');
async function run() {
  const auth = new GoogleAuth({
    keyFile: 'aniverse-leans.json',
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  console.log(typeof token, token);
}
run();
