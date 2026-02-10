const { authorize } = require("./auth");

const adminAuth = authorize("admin");

module.exports = adminAuth;