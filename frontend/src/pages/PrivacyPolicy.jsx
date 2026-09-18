import React from "react";

export default function PrivacyPolicy() {
const today = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

return (
<div className="card" style={{ maxWidth: 720, margin: "0 auto" }}>
<h2>Privacy Policy</h2>
<p className="page-subtitle">Last updated: {today}</p>

<p>
Workshop Live ("we", "our", "us") respects your privacy. This page explains what information
we collect when you use this app and how we use it.
</p>

<h3>Information we collect</h3>
<p>
When you register, we collect your name, email address, and password (stored securely as a
hash). When you join or host workshops, we store the workshop details, your enrolment, and
any feedback or certificates linked to your account.
</p>

<h3>How we use it</h3>
<p>
We use this information only to run the app — to log you in, show you your workshops, send
you real-time notifications about workshops you've joined, and issue certificates. We do not
sell your data to third parties.
</p>

<h3>Payments</h3>
<p>
Paid courses are processed through Razorpay. We do not store your card or payment details —
Razorpay handles payment information directly.
</p>

<h3>Contact</h3>
<p>
Questions about this policy? Email us at{" "}
<a href="mailto:ayushkr.8982@gmail.com">ayushkr.8982@gmail.com</a>.
</p>
</div>
);
}

