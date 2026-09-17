// Minimal Razorpay REST client using Node's built-in fetch — no extra npm
// package needed (avoids yet another `npm install` step on the user's machine).
const crypto = require("crypto");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

function authHeader() {
  const token = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  return `Basic ${token}`;
}

// amountInRupees -> Razorpay order (amount must be sent to Razorpay in paise)
async function createOrder({ amountInRupees, receipt, notes }) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys are not configured on the server (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");
  }
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      amount: Math.round(amountInRupees * 100),
      currency: "INR",
      receipt,
      notes,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.description || "Could not create Razorpay order");
  }
  return data;
}

// Verifies the signature Razorpay returns to the browser after a successful checkout
function verifySignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

module.exports = { createOrder, verifySignature, RAZORPAY_KEY_ID };
