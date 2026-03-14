import { Link } from "react-router-dom";

const LAST_UPDATED = "March 11, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#050509] text-neutral-400 font-sans">
      {/* Nav */}
      <nav className="border-b border-white/[0.04] px-6 lg:px-16 py-4 flex items-center justify-between">
        <Link to="/landing" className="flex items-center gap-2.5 group">
          <div className="relative">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="1" width="16" height="16" rx="4" stroke="#7c3aed" strokeWidth="1.2" opacity="0.6" />
              <circle cx="9" cy="9" r="2.5" fill="#7c3aed" opacity="0.7" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-neutral-300 group-hover:text-white transition-colors">Grapken</span>
        </Link>
        <Link to="/landing" className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors font-mono">
          ← Back to site
        </Link>
      </nav>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-[10px] font-mono text-neutral-700 mb-4 tracking-widest uppercase">Legal</p>
        <h1
          className="text-3xl sm:text-4xl font-bold text-neutral-100 mb-3 leading-tight"
          style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
        >
          Privacy Policy
        </h1>
        <p className="text-xs text-neutral-700 font-mono mb-12">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-10 text-sm leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">1. Overview</h2>
            <p>
              Grapken (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a browser-based game design tool. We are committed to
              being transparent about what data we collect, why, and how. This policy applies to
              the Grapken website and application (collectively, the &quot;Service&quot;).
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">2. Data we do NOT collect</h2>
            <p className="mb-3">
              The core Grapken application runs entirely in your browser. All project data —
              widgets, canvases, tasks, notes, and design documents — is stored exclusively in your
              browser&apos;s <code className="text-violet-400 bg-violet-500/10 px-1 rounded text-xs">localStorage</code>.
              We have no access to it. We do not transmit it to any server.
            </p>
            <p className="mb-3 text-neutral-600 text-xs">
              Since Grapken is{" "}
              <a href="https://github.com/byronrosas/grapken-core" target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:text-violet-400 transition-colors">open source (AGPL-3.0)</a>,
              you can verify these claims directly in the source code.
              There are no hidden network calls in the application.
            </p>
            <ul className="list-none space-y-1.5 text-neutral-500">
              {[
                "No account registration is required.",
                "No project files or canvas content are sent to our servers.",
                "No tracking pixels or behavioral profiling tools are active in the application.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5 shrink-0 text-xs">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">3. Data we DO collect</h2>

            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2 mt-4">3.1 Waitlist & survey (Tally.so)</h3>
            <p className="mb-3">
              When you submit the Pro waitlist form, your responses — including your email address
              if provided — are collected and stored by{" "}
              <span className="text-neutral-300">Tally.so</span>, our third-party form provider.
              We use this data solely to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-neutral-500 ml-2 mb-3">
              <li>Notify you when Grapken Pro launches.</li>
              <li>Inform product decisions based on aggregated survey responses.</li>
            </ul>
            <p className="text-neutral-600 text-xs">
              Your email will never be sold, rented, or shared with third parties for marketing
              purposes. You can request deletion at any time by emailing us (see Section 7).
              Tally&apos;s own privacy policy governs how they store form data:{" "}
              <span className="text-neutral-500">tally.so/privacy</span>.
            </p>

            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2 mt-6">3.2 Basic analytics (optional, future)</h3>
            <p>
              We may add privacy-respecting, cookie-free analytics (e.g., Plausible or Fathom) in
              the future to understand aggregate page traffic. If we do, we will update this
              policy, and no personal data will be collected or shared.
            </p>

            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2 mt-6">3.3 Grapken Pro (coming soon)</h3>
            <p>
              When the Pro plan launches, cloud sync and team collaboration features will require an
              account. At that point we will collect:
            </p>
            <ul className="list-disc list-inside space-y-1 text-neutral-500 ml-2 mt-2">
              <li>Email address (account identifier).</li>
              <li>Encrypted project data (for cloud backup and sync).</li>
              <li>Billing information — processed by a PCI-compliant payment provider (Stripe or equivalent). We do not store raw card numbers.</li>
            </ul>
            <p className="mt-3 text-neutral-600 text-xs">
              This policy will be updated with full detail before Pro launches.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">4. Cookies</h2>
            <p>
              The current version of Grapken does not use cookies. If cookies are introduced in
              the future (e.g., for authentication in Pro), we will update this policy and provide
              a consent mechanism where legally required.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">5. Data retention</h2>
            <p className="mb-2">
              <span className="text-neutral-300 font-medium">Local data:</span> Retained in your browser until you clear site data or uninstall the browser. We have no control over it.
            </p>
            <p>
              <span className="text-neutral-300 font-medium">Waitlist emails:</span> Retained until the waitlist program ends or until you request deletion. We will not contact you more than necessary.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">6. Your rights</h2>
            <p className="mb-3">
              Depending on your jurisdiction (GDPR, CCPA, etc.), you may have rights to access,
              correct, or delete your personal data. Since we hold minimal data, we can typically
              fulfill these requests quickly.
            </p>
            <p>To exercise any right, contact us at the address in Section 7.</p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">7. Contact</h2>
            <p>
              For any privacy-related questions or data deletion requests, email us at{" "}
              <span className="text-violet-400">contact@grapken.com</span>. We aim to respond within
              5 business days.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">8. Changes to this policy</h2>
            <p>
              We will update this page when our data practices change. Material changes will be
              announced on the Grapken website or communicated to waitlist subscribers. Continued
              use of the Service after a policy update constitutes acceptance of the revised terms.
            </p>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-16 pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <span className="text-[10px] text-neutral-800 font-mono">© 2026 Grapken — v0.1.0 Beta</span>
          <div className="flex items-center gap-5 text-[10px] font-mono text-neutral-700">
            <Link to="/terms" className="hover:text-neutral-400 transition-colors">Terms of Service</Link>
            <Link to="/landing" className="hover:text-neutral-400 transition-colors">← Back to site</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
