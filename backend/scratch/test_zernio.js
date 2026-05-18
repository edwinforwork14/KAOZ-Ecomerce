const fetch = require("node-fetch");

async function testZernio() {
  const apiKey = "sk_03cd34edf5935d98fc4a323c1c81a058b5585995e1c0918238cd3ca919fbb06f";
  console.log("Connecting to Zernio API...");
  try {
    const response = await fetch("https://zernio.com/api/v1/profiles", {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    
    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error calling Zernio API:", error);
  }
}

testZernio();
