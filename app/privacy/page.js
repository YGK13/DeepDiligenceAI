// ============================================================================
// app/privacy/page.js — DueDrill Privacy Policy
// ============================================================================
// Comprehensive privacy policy for the DueDrill AI due diligence platform.
// Server component — no 'use client' directive needed (static content).
// Company: 5FT View Consulting | Contact: yuri@5ftview.com
// Last Updated: March 2026
// ============================================================================

import Link from 'next/link';

// ============ METADATA EXPORT ============
export const metadata = {
  title: 'Privacy Policy | DueDrill',
  description: 'DueDrill Privacy Policy — how we collect, use, and protect your data.',
};

// ============ REUSABLE STYLE CONSTANTS ============
// These mirror the app's dark theme palette for consistency
const STYLES = {
  heading1: 'text-3xl md:text-4xl font-extrabold text-[#e8e9ed] mb-6',
  heading2: 'text-xl md:text-2xl font-bold text-[#e8e9ed] mt-10 mb-4',
  heading3: 'text-lg font-semibold text-[#e8e9ed] mt-6 mb-3',
  paragraph: 'text-[#9ca0b0] text-sm leading-relaxed mb-4',
  list: 'list-disc list-inside text-[#9ca0b0] text-sm leading-relaxed mb-4 space-y-1.5 pl-2',
  link: 'text-[#4a7dff] hover:underline',
  sectionNumber: 'text-[#4a7dff] font-bold mr-2',
};

// ============ COMPONENT ============
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e8e9ed]">
      {/* ============ NAV BAR ============ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f1117]/90 backdrop-blur-md border-b border-[#2d3148]/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/landing" className="text-[#4a7dff] font-bold text-xl hover:opacity-80 transition-opacity">
            DueDrill
          </Link>
          <Link
            href="/landing"
            className="text-[#9ca0b0] text-sm hover:text-[#e8e9ed] transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>
      </nav>

      {/* ============ MAIN CONTENT ============ */}
      <main className="pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* ============ PAGE HEADER ============ */}
          <div className="mb-12">
            <h1 className={STYLES.heading1}>Privacy Policy</h1>
            <p className="text-[#6b7084] text-sm">
              Last Updated: March 2026
            </p>
            <p className={`${STYLES.paragraph} mt-4`}>
              This Privacy Policy describes how 5FT View Consulting (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, and shares information in connection with your use of the DueDrill platform (the &ldquo;Service&rdquo;), including the website at duedrill.com and any related applications, tools, or services. By accessing or using the Service, you agree to this Privacy Policy.
            </p>
          </div>

          {/* ============ SECTION 1: INFORMATION WE COLLECT ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>1.</span>
            Information We Collect
          </h2>

          <h3 className={STYLES.heading3}>1.1 Account Information</h3>
          <p className={STYLES.paragraph}>
            When you create an account, we collect information necessary to establish and maintain your account, including:
          </p>
          <ul className={STYLES.list}>
            <li>Email address</li>
            <li>Full name</li>
            <li>Password (stored as a cryptographic hash; we never store plaintext passwords)</li>
            <li>Organization or fund name (optional)</li>
            <li>Billing information (processed and stored by our payment processor, Stripe)</li>
          </ul>

          <h3 className={STYLES.heading3}>1.2 Company Research Data</h3>
          <p className={STYLES.paragraph}>
            The core function of DueDrill is to help you conduct due diligence on companies. In the course of using the Service, you may create, upload, or generate the following types of data:
          </p>
          <ul className={STYLES.list}>
            <li>Company profiles and names you research</li>
            <li>Due diligence notes, scores, and assessments across our 16-category framework</li>
            <li>AI-generated research findings from third-party AI providers</li>
            <li>Investment memos and reports you generate</li>
            <li>Imported data files (JSON, CSV, or other structured data)</li>
          </ul>
          <p className={STYLES.paragraph}>
            <strong className="text-[#e8e9ed]">You retain full ownership of all company research data you create or upload.</strong> We do not claim any intellectual property rights over your data.
          </p>

          <h3 className={STYLES.heading3}>1.3 API Keys</h3>
          <p className={STYLES.paragraph}>
            DueDrill allows you to connect your own API keys for AI research providers (Perplexity, Anthropic/Claude, OpenAI/GPT-4, Groq). When you provide these keys:
          </p>
          <ul className={STYLES.list}>
            <li>API keys are encrypted at rest using AES-256 encryption</li>
            <li>Keys are transmitted only over HTTPS/TLS-encrypted connections</li>
            <li>Keys are used solely to make API calls on your behalf and are never shared with third parties</li>
            <li>You can delete your API keys at any time through your account settings</li>
            <li>We do not log or store the content of API requests or responses beyond what is necessary to display results to you</li>
          </ul>

          <h3 className={STYLES.heading3}>1.4 Usage and Analytics Data</h3>
          <p className={STYLES.paragraph}>
            We automatically collect certain technical and usage information when you access the Service:
          </p>
          <ul className={STYLES.list}>
            <li>Device type, browser type, and operating system</li>
            <li>IP address (anonymized for analytics purposes)</li>
            <li>Pages and features accessed, time spent on pages</li>
            <li>Referring URLs and navigation paths</li>
            <li>Error logs and performance metrics</li>
            <li>Feature usage patterns (e.g., which AI providers are used, frequency of report generation)</li>
          </ul>

          {/* ============ SECTION 2: HOW WE USE YOUR INFORMATION ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>2.</span>
            How We Use Your Information
          </h2>
          <p className={STYLES.paragraph}>
            We use the information we collect for the following purposes:
          </p>
          <ul className={STYLES.list}>
            <li><strong className="text-[#e8e9ed]">Providing the Service:</strong> To operate, maintain, and deliver the features and functionality of DueDrill, including AI-powered research, scoring, and report generation.</li>
            <li><strong className="text-[#e8e9ed]">Account Management:</strong> To create, authenticate, and manage your account, process payments, and communicate with you about your subscription.</li>
            <li><strong className="text-[#e8e9ed]">Service Improvement:</strong> To analyze usage patterns, identify bugs, improve AI research quality, and develop new features. We use aggregated, anonymized data for this purpose.</li>
            <li><strong className="text-[#e8e9ed]">Security:</strong> To detect, prevent, and address fraud, abuse, security risks, and technical issues.</li>
            <li><strong className="text-[#e8e9ed]">Communications:</strong> To send you transactional emails (account verification, password resets, billing receipts), service announcements, and, with your consent, marketing communications.</li>
            <li><strong className="text-[#e8e9ed]">Legal Compliance:</strong> To comply with applicable laws, regulations, legal processes, or governmental requests.</li>
          </ul>
          <p className={STYLES.paragraph}>
            <strong className="text-[#e8e9ed]">We do not sell, rent, or trade your personal information to third parties.</strong> We do not use your company research data to train AI models or for any purpose other than providing the Service to you.
          </p>

          {/* ============ SECTION 3: THIRD-PARTY SERVICES ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>3.</span>
            Third-Party Services
          </h2>
          <p className={STYLES.paragraph}>
            DueDrill integrates with the following third-party services to deliver its functionality. Each service has its own privacy policy governing data it processes:
          </p>

          <h3 className={STYLES.heading3}>3.1 Supabase (Authentication &amp; Database)</h3>
          <p className={STYLES.paragraph}>
            We use Supabase for user authentication, database storage, and cloud synchronization. Your account data and research data (when cloud sync is enabled) are stored in Supabase-managed infrastructure. Supabase processes data in accordance with its privacy policy and employs industry-standard security measures including encryption at rest and in transit.
          </p>

          <h3 className={STYLES.heading3}>3.2 Stripe (Payment Processing)</h3>
          <p className={STYLES.paragraph}>
            We use Stripe to process subscription payments. We do not directly handle, store, or have access to your full credit card number. Stripe is PCI DSS Level 1 certified — the highest level of certification in the payment card industry. Stripe&apos;s use of your data is governed by its privacy policy.
          </p>

          <h3 className={STYLES.heading3}>3.3 AI Research Providers</h3>
          <p className={STYLES.paragraph}>
            When you run AI-powered research, your queries are sent to the AI provider you select (Perplexity, Anthropic, OpenAI, or Groq) using your own API keys. We send only the minimal information necessary to generate research results (company name, research context). Each AI provider processes queries according to its own privacy policy and terms of service. We recommend reviewing their respective policies.
          </p>

          <h3 className={STYLES.heading3}>3.4 Analytics</h3>
          <p className={STYLES.paragraph}>
            We may use privacy-focused analytics tools to understand how the Service is used. Analytics data is aggregated and anonymized and is not used to identify individual users.
          </p>

          {/* ============ SECTION 4: API KEY HANDLING ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>4.</span>
            API Key Security
          </h2>
          <p className={STYLES.paragraph}>
            We take the security of your API keys extremely seriously. Our API key handling practices include:
          </p>
          <ul className={STYLES.list}>
            <li><strong className="text-[#e8e9ed]">Encryption at Rest:</strong> All API keys are encrypted using AES-256 before being stored in our database.</li>
            <li><strong className="text-[#e8e9ed]">Encryption in Transit:</strong> API keys are transmitted exclusively over HTTPS/TLS-encrypted connections.</li>
            <li><strong className="text-[#e8e9ed]">No Sharing:</strong> We never share, sell, or expose your API keys to any third party. Keys are used only to make API calls on your behalf.</li>
            <li><strong className="text-[#e8e9ed]">User Control:</strong> You can view, update, or delete your stored API keys at any time from your account settings.</li>
            <li><strong className="text-[#e8e9ed]">Access Controls:</strong> API keys are accessible only through authenticated, authorized requests from your account.</li>
            <li><strong className="text-[#e8e9ed]">No Logging:</strong> We do not log API keys in application logs, error reports, or analytics systems.</li>
          </ul>

          {/* ============ SECTION 5: DATA RETENTION ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>5.</span>
            Data Retention
          </h2>
          <p className={STYLES.paragraph}>
            We retain your data in accordance with the following practices:
          </p>
          <ul className={STYLES.list}>
            <li><strong className="text-[#e8e9ed]">Account Data:</strong> Retained for as long as your account is active. Upon account deletion, your personal data is permanently deleted within 30 days.</li>
            <li><strong className="text-[#e8e9ed]">Research Data:</strong> You maintain full control over your company research data. You can export all data at any time (JSON format) and delete individual companies or your entire dataset at any time.</li>
            <li><strong className="text-[#e8e9ed]">API Keys:</strong> Deleted immediately upon your request or upon account deletion.</li>
            <li><strong className="text-[#e8e9ed]">Usage Analytics:</strong> Aggregated analytics data is retained for up to 24 months. Anonymized data may be retained indefinitely for statistical purposes.</li>
            <li><strong className="text-[#e8e9ed]">Billing Records:</strong> Retained as required by applicable tax and financial regulations (typically 7 years).</li>
            <li><strong className="text-[#e8e9ed]">Backups:</strong> Database backups containing your data are automatically purged within 90 days of data deletion.</li>
          </ul>

          {/* ============ SECTION 6: COOKIES ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>6.</span>
            Cookies and Local Storage
          </h2>
          <p className={STYLES.paragraph}>
            DueDrill uses a minimal, privacy-focused approach to cookies and browser storage:
          </p>
          <ul className={STYLES.list}>
            <li><strong className="text-[#e8e9ed]">Authentication Session Cookie:</strong> A strictly necessary cookie is set to maintain your login session. This cookie is essential for the Service to function and cannot be disabled while using the Service.</li>
            <li><strong className="text-[#e8e9ed]">Local Storage:</strong> We use browser local storage to cache application preferences and improve performance. This data remains on your device and is not transmitted to our servers.</li>
            <li><strong className="text-[#e8e9ed]">No Tracking Cookies:</strong> We do not use advertising cookies, retargeting pixels, or third-party tracking cookies.</li>
          </ul>

          {/* ============ SECTION 7: GDPR COMPLIANCE ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>7.</span>
            Your Rights Under GDPR (European Economic Area)
          </h2>
          <p className={STYLES.paragraph}>
            If you are located in the European Economic Area (EEA), you have the following rights under the General Data Protection Regulation (GDPR):
          </p>
          <ul className={STYLES.list}>
            <li><strong className="text-[#e8e9ed]">Right of Access:</strong> You have the right to request a copy of the personal data we hold about you.</li>
            <li><strong className="text-[#e8e9ed]">Right to Rectification:</strong> You have the right to request correction of inaccurate personal data.</li>
            <li><strong className="text-[#e8e9ed]">Right to Erasure:</strong> You have the right to request deletion of your personal data, subject to certain legal exceptions.</li>
            <li><strong className="text-[#e8e9ed]">Right to Restriction:</strong> You have the right to request that we restrict processing of your personal data in certain circumstances.</li>
            <li><strong className="text-[#e8e9ed]">Right to Data Portability:</strong> You have the right to receive your personal data in a structured, commonly used, machine-readable format (JSON) and to transfer it to another controller.</li>
            <li><strong className="text-[#e8e9ed]">Right to Object:</strong> You have the right to object to processing of your personal data for direct marketing purposes.</li>
            <li><strong className="text-[#e8e9ed]">Right to Withdraw Consent:</strong> Where processing is based on consent, you have the right to withdraw consent at any time.</li>
          </ul>
          <p className={STYLES.paragraph}>
            Our legal basis for processing personal data includes: (a) performance of our contract with you (providing the Service), (b) our legitimate interests (improving the Service, security), and (c) your consent (marketing communications). To exercise any of these rights, contact us at{' '}
            <a href="mailto:yuri@5ftview.com" className={STYLES.link}>yuri@5ftview.com</a>. We will respond to your request within 30 days.
          </p>

          {/* ============ SECTION 8: CCPA COMPLIANCE ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>8.</span>
            Your Rights Under CCPA (California)
          </h2>
          <p className={STYLES.paragraph}>
            If you are a California resident, the California Consumer Privacy Act (CCPA) grants you the following rights:
          </p>
          <ul className={STYLES.list}>
            <li><strong className="text-[#e8e9ed]">Right to Know:</strong> You have the right to request disclosure of the categories and specific pieces of personal information we have collected, the sources of collection, the business purposes, and the categories of third parties with whom we share data.</li>
            <li><strong className="text-[#e8e9ed]">Right to Delete:</strong> You have the right to request deletion of your personal information, subject to certain exceptions.</li>
            <li><strong className="text-[#e8e9ed]">Right to Opt-Out of Sale:</strong> We do not sell your personal information. As such, there is no need to opt out. If this practice ever changes, we will provide a clear opt-out mechanism.</li>
            <li><strong className="text-[#e8e9ed]">Right to Non-Discrimination:</strong> We will not discriminate against you for exercising any of your CCPA rights.</li>
          </ul>
          <p className={STYLES.paragraph}>
            To exercise your CCPA rights, contact us at{' '}
            <a href="mailto:yuri@5ftview.com" className={STYLES.link}>yuri@5ftview.com</a>. We will verify your identity before processing your request and respond within 45 days.
          </p>

          {/* ============ SECTION 9: INTERNATIONAL DATA TRANSFERS ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>9.</span>
            International Data Transfers
          </h2>
          <p className={STYLES.paragraph}>
            5FT View Consulting is based in Israel with operations in the United States. Your data may be transferred to and processed in countries outside your country of residence, including:
          </p>
          <ul className={STYLES.list}>
            <li><strong className="text-[#e8e9ed]">Israel:</strong> Where our company is headquartered. Israel has been recognized by the European Commission as providing an adequate level of data protection.</li>
            <li><strong className="text-[#e8e9ed]">United States:</strong> Where certain infrastructure providers (Supabase, Stripe, AI providers) may process data.</li>
          </ul>
          <p className={STYLES.paragraph}>
            Where data is transferred to countries that have not received an adequacy determination from the European Commission, we rely on Standard Contractual Clauses (SCCs) or other lawful transfer mechanisms to ensure your data receives an adequate level of protection. Supabase infrastructure is hosted in secure, SOC 2-compliant data centers.
          </p>

          {/* ============ SECTION 10: DATA SECURITY ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>10.</span>
            Data Security
          </h2>
          <p className={STYLES.paragraph}>
            We implement industry-standard technical and organizational measures to protect your data, including:
          </p>
          <ul className={STYLES.list}>
            <li>All data transmitted between your browser and our servers is encrypted using TLS 1.2 or higher</li>
            <li>Sensitive data (API keys, passwords) is encrypted at rest using AES-256 encryption</li>
            <li>Database access is restricted through role-based access controls and row-level security policies</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Employee access to production data is limited to authorized personnel on a need-to-know basis</li>
          </ul>
          <p className={STYLES.paragraph}>
            While we strive to protect your personal information, no method of electronic storage or transmission is 100% secure. We cannot guarantee absolute security but are committed to promptly notifying affected users in the event of a data breach, in accordance with applicable laws.
          </p>

          {/* ============ SECTION 11: CHILDREN'S PRIVACY ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>11.</span>
            Children&apos;s Privacy
          </h2>
          <p className={STYLES.paragraph}>
            The Service is intended for professional and business use and is not directed to individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have inadvertently collected personal information from a child under 18, we will take steps to delete such information promptly. If you believe that a child under 18 has provided us with personal information, please contact us at{' '}
            <a href="mailto:yuri@5ftview.com" className={STYLES.link}>yuri@5ftview.com</a>.
          </p>

          {/* ============ SECTION 12: CHANGES TO THIS POLICY ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>12.</span>
            Changes to This Privacy Policy
          </h2>
          <p className={STYLES.paragraph}>
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will:
          </p>
          <ul className={STYLES.list}>
            <li>Update the &ldquo;Last Updated&rdquo; date at the top of this page</li>
            <li>Notify you via email (for material changes) at least 30 days before the changes take effect</li>
            <li>Display a prominent notice within the Service</li>
          </ul>
          <p className={STYLES.paragraph}>
            Your continued use of the Service after any changes to this Privacy Policy constitutes your acceptance of the updated policy. We encourage you to review this page periodically.
          </p>

          {/* ============ SECTION 13: CONTACT INFORMATION ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>13.</span>
            Contact Information
          </h2>
          <p className={STYLES.paragraph}>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
          </p>
          <div className="bg-[#1e2130] border border-[#2d3148] rounded-xl p-6 mb-8">
            <p className="text-[#e8e9ed] text-sm font-semibold mb-2">5FT View Consulting</p>
            <p className="text-[#9ca0b0] text-sm mb-1">
              Email:{' '}
              <a href="mailto:yuri@5ftview.com" className={STYLES.link}>yuri@5ftview.com</a>
            </p>
            <p className="text-[#9ca0b0] text-sm mb-1">
              Website:{' '}
              <a href="https://duedrill.com" className={STYLES.link}>duedrill.com</a>
            </p>
            <p className="text-[#9ca0b0] text-sm">
              For GDPR inquiries, you may also lodge a complaint with your local data protection authority.
            </p>
          </div>

          {/* ============ BACK LINK ============ */}
          <div className="border-t border-[#2d3148] pt-8 mt-12">
            <Link
              href="/landing"
              className="text-[#4a7dff] text-sm hover:underline"
            >
              &larr; Back to DueDrill Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
