import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
const year = new Date().getFullYear();
const shareUrl = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent("https://workshop-live-eight.vercel.app");

return (
<footer className="site-footer">
<div className="footer-inner">
<div className="footer-col footer-brand">
<div className="footer-logo">
<span className="logo-badge">🎓</span>
Workshop Live
</div>
<p className="footer-tagline">
Manage workshops in one place — go live, delay or cancel, and students get instant updates.
</p>
</div>

<div className="footer-col">
<h4>Contact</h4>
<a href="mailto:ayushkr.8982@gmail.com" className="footer-link">ayushkr.8982@gmail.com</a>
</div>

<div className="footer-col">
<h4>Legal</h4>
<Link to="/privacy" className="footer-link">Privacy Policy</Link>
</div>

<div className="footer-col">
<h4>Follow</h4>
<a href={shareUrl} target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="Share Workshop Live on Facebook">
<span className="footer-social-icon">f</span>
Facebook
</a>
</div>
</div>

<div className="footer-bottom">© {year} Workshop Live. All rights reserved.</div>
</footer>
);
}

