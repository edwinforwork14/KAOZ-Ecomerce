const net = require('net');

const client = net.connect({ host: 'aws-1-us-east-2.pooler.supabase.com', port: 6543 }, () => {
  console.log('✅ Connected to server!');
  client.end();
});

client.on('error', (err) => {
  console.error('❌ Connection failed:', err.message);
});

client.on('timeout', () => {
  console.error('❌ Connection timed out');
  client.end();
});

client.setTimeout(5000);
