const fetch = require("node-fetch");

async function inspectPosts() {
  const apiKey = "sk_03cd34edf5935d98fc4a323c1c81a058b5585995e1c0918238cd3ca919fbb06f";
  const accountId = "6a0a4f4a5e333c05298b6702";
  const url = `https://zernio.com/api/v1/accounts/${accountId}/posts`;

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    const data = await response.json();
    console.log("Full posts list:\n", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

inspectPosts();
