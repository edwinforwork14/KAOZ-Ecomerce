const fetch = require("node-fetch");

async function testMedia() {
  const apiKey = "sk_03cd34edf5935d98fc4a323c1c81a058b5585995e1c0918238cd3ca919fbb06f";
  const accountId = "6a0a4f4a5e333c05298b6702";
  
  const endpoints = [
    `https://zernio.com/api/v1/posts?accountId=${accountId}`,
    `https://zernio.com/api/v1/accounts/${accountId}/posts`,
    `https://zernio.com/api/v1/accounts/${accountId}/media`,
    `https://zernio.com/api/v1/media?accountId=${accountId}`,
    `https://zernio.com/api/v1/analytics/instagram/account-insights`
  ];

  for (const url of endpoints) {
    console.log(`\nQuerying endpoint: ${url}`);
    try {
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });
      console.log("Status:", response.status);
      const data = await response.json();
      console.log("Data:", JSON.stringify(data, null, 2).slice(0, 1000));
    } catch (error) {
      console.error("Error:", error);
    }
  }
}

testMedia();
