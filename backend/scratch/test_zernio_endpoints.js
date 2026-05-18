const fetch = require("node-fetch");

async function testEndpoints() {
  const apiKey = "sk_03cd34edf5935d98fc4a323c1c81a058b5585995e1c0918238cd3ca919fbb06f";
  const endpoints = [
    "https://zernio.com/api/v1/accounts",
    "https://zernio.com/api/v1/posts",
    "https://zernio.com/api/v1/profiles/69fd3476303bed409e046898/accounts"
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

testEndpoints();
