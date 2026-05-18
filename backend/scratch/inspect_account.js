const fetch = require("node-fetch");

async function inspectAccount() {
  const apiKey = "sk_03cd34edf5935d98fc4a323c1c81a058b5585995e1c0918238cd3ca919fbb06f";
  const url = "https://zernio.com/api/v1/accounts";

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    const data = await response.json();
    console.log("Full account details:\n", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

inspectAccount();
