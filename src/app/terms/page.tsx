import { Link } from "react-router-dom";

const LAST_UPDATED = "March 11, 2026";

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-xs text-neutral-700 font-mono mb-12">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-10 text-sm leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Grapken (&quot;the Service&quot;), you agree to be bound by these Terms
              of Service (&quot;Terms&quot;). If you do not agree, do not use the Service. These Terms apply
              to all users of the hosted application. Use of the source code is additionally governed
              by the AGPL-3.0 license included in the repository.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">2. Description of Service</h2>
            <p className="mb-3">
              Grapken is a browser-based game design documentation tool, published as open source
              software under the{" "}
              <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 transition-colors">GNU Affero General Public License v3.0 (AGPL-3.0)</a>.
              The core application runs entirely in your browser using local storage.
              The upcoming Pro tier will add optional cloud sync and team collaboration features
              as a separate hosted product.
            </p>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of the Service at
              any time without liability, though we will make reasonable efforts to notify users
              of material changes.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">3. User Content</h2>

            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2 mt-4">3.1 Ownership</h3>
            <p>
              All content you create using Grapken — including game design documents, canvases,
              notes, characters, mechanics, and any other material (&quot;User Content&quot;) — remains
              your exclusive intellectual property. We claim no ownership over your User Content.
            </p>

            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2 mt-6">3.2 Your responsibility</h3>
            <p className="mb-3">
              You are solely and entirely responsible for all User Content you create, store, or
              share using the Service. By using Grapken, you represent and warrant that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-500 ml-2">
              <li>
                You own all rights to the User Content, or you have obtained all necessary
                licenses, permissions, and consents to use it.
              </li>
              <li>
                Your User Content does not infringe, misappropriate, or violate any third-party
                intellectual property rights, including copyrights, trademarks, trade secrets,
                patents, or rights of publicity.
              </li>
              <li>
                Your User Content does not violate any applicable law or regulation, including
                laws governing privacy, defamation, or obscenity.
              </li>
              <li>
                You will not use Grapken to create, store, or distribute content that is unlawful,
                harmful, threatening, abusive, defamatory, or otherwise objectionable.
              </li>
            </ul>

            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2 mt-6">3.3 No monitoring</h3>
            <p>
              In the free Beta, all data lives locally in your browser. We have no technical
              access to your User Content and therefore cannot monitor it. You acknowledge this
              and accept full responsibility for what you create and store.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">4. Intellectual Property Disclaimer</h2>
            <p className="mb-3">
              Grapken is a documentation and design tool. It does not grant you any rights to
              third-party intellectual property. If you reference, document, or build upon
              existing games, characters, mechanics, or other protected works in your design
              documents, you do so at your own risk and responsibility.
            </p>
            <p className="mb-3">
              <span className="text-neutral-200 font-medium">We are not responsible for, and expressly disclaim all liability arising from:</span>
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-500 ml-2">
              <li>
                Any infringement of third-party intellectual property rights by content you
                create or store in Grapken.
              </li>
              <li>
                Any claims, damages, or legal proceedings brought against you by third parties
                as a result of your User Content.
              </li>
              <li>
                Any losses you suffer as a result of relying on Grapken for the protection or
                backup of your creative work.
              </li>
            </ul>
            <p className="mt-4">
              If you receive a copyright or intellectual property infringement claim related to use
              of the Service, you agree to handle it independently and indemnify Grapken
              accordingly (see Section 7).
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">5. Disclaimer of Warranties</h2>
            <p className="mb-3">
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
              either express or implied, including but not limited to implied warranties of
              merchantability, fitness for a particular purpose, or non-infringement.
            </p>
            <p>
              We do not warrant that the Service will be uninterrupted, error-free, or free of
              viruses or other harmful components. Because project data is stored in{" "}
              <code className="text-violet-400 bg-violet-500/10 px-1 rounded text-xs">localStorage</code>,
              data loss can occur if you clear browser storage, change browsers, or use private/incognito
              mode. We strongly recommend exporting your work regularly using the built-in export features.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, Grapken and its operators shall
              not be liable for any indirect, incidental, special, consequential, or punitive
              damages — including loss of profits, data, goodwill, or other intangible losses —
              arising out of or in connection with your use of (or inability to use) the Service,
              even if we have been advised of the possibility of such damages. Our total aggregate
              liability shall not exceed the amount you paid us in the past twelve months (or $0
              if you are on the free tier).
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">7. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless Grapken and its operators from
              any claims, damages, losses, costs, and expenses (including reasonable legal fees)
              arising out of or relating to: (a) your use of the Service; (b) your User Content;
              (c) your violation of these Terms; or (d) your violation of any applicable law or
              third-party rights.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">8. Pro Plan</h2>
            <p className="mb-3">
              When the Pro plan launches, additional terms governing subscriptions, billing,
              cancellations, and refunds will be added to this document. Key principles we commit
              to upfront:
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-500 ml-2">
              <li>You can cancel your subscription at any time.</li>
              <li>You retain full ownership of all project data upon cancellation.</li>
              <li>We will provide a data export mechanism before any account deletion.</li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">9. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable law.
              Any disputes shall be resolved through good-faith negotiation first. If unresolved,
              disputes shall be submitted to the competent courts of the jurisdiction in which
              Grapken operates.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">10. Changes to Terms</h2>
            <p>
              We reserve the right to update these Terms at any time. We will post the revised
              Terms with an updated date. Your continued use of the Service after any revision
              constitutes your acceptance of the new Terms.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">11. License &amp; Intellectual Property</h2>

            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2 mt-4">11.1 Source code — AGPL-3.0</h3>
            <p className="mb-3">
              The Grapken core application source code is released under the{" "}
              <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 transition-colors">GNU Affero General Public License v3.0 (AGPL-3.0)</a>.
              You are free to use, study, copy, modify, and distribute the code under the terms
              of that license. Any modified version made available over a network must also be
              released under AGPL-3.0.
            </p>
            <p className="mb-3">
              The full license text is included in the repository at{" "}
              <code className="text-violet-400 bg-violet-500/10 px-1 rounded text-xs">LICENSE</code>.
              Nothing in these Terms restricts rights granted to you by the AGPL-3.0 license.
            </p>

            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2 mt-6">11.2 Trademark</h3>
            <p className="mb-3">
              The <span className="text-neutral-200 font-medium">Grapken</span> name, logo, and
              associated branding are trademarks of Grapken and are{" "}
              <span className="text-neutral-200 font-medium">not</span> covered by the AGPL-3.0
              license. You may not use the Grapken name or logo to identify a modified or forked
              version of the software without explicit written permission, so as not to cause
              confusion with the official project.
            </p>
            <p>
              Permitted uses include clearly attributing the original project (e.g.,
              &quot;Based on Grapken&quot;) in README files or documentation.
            </p>

            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2 mt-6">11.3 Your content</h3>
            <p>
              Nothing in this section affects your ownership of content you create using the
              Service. See Section 3.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">12. Contributor License Agreement (CLA)</h2>
            <p className="mb-3">
              If you submit a contribution (pull request, patch, or other modification) to the
              Grapken source code, you must sign the{" "}
              <a
                href="https://cla-assistant.io/byronrosas/grapken-core"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 transition-colors"
              >
                Contributor License Agreement
              </a>{" "}
              before your contribution can be merged.
            </p>
            <p className="mb-3">
              The CLA grants Grapken a non-exclusive license to use your contribution under
              both the AGPL-3.0 license and any future license (including a commercial license
              for the Pro product). You retain full copyright of your contribution.
            </p>
            <p className="text-neutral-600 text-xs">
              This is standard practice for open-core projects (examples: MongoDB, GitLab,
              Elasticsearch). It allows the project to be sustainable while keeping the
              core open source.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-base font-semibold text-neutral-200 mb-3">13. Contact</h2>
            <p>
              Questions about these Terms? Email us at{" "}
              <span className="text-violet-400">contact@grapken.com</span>.
            </p>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-16 pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <span className="text-[10px] text-neutral-800 font-mono">© 2026 Grapken — v0.1.0 Beta</span>
          <div className="flex items-center gap-5 text-[10px] font-mono text-neutral-700">
            <Link to="/privacy" className="hover:text-neutral-400 transition-colors">Privacy Policy</Link>
            <Link to="/landing" className="hover:text-neutral-400 transition-colors">← Back to site</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
