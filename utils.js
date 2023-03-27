function base64Decode(str) {
  return Buffer.from(str, "base64").toString("utf-8");
}

module.exports = {
  base64Decode,
};
