// ============================================================================
// app/terms/page.js — DueDrill Terms of Service
// ============================================================================
// Comprehensive Terms of Service for the DueDrill AI due diligence platform.
// Server component — no 'use client' directive needed (static content).
// Company: 5FT View Consulting | Contact: yuri@5ftview.com
// Governing Law: State of Delaware, USA
// Last Updated: March 2026
// ============================================================================

import Link from 'next/link';

// ============ METADATA EXPORT ============
export const metadata = {
  title: 'Terms of Service | DueDrill',
  description: 'DueDrill Terms of Service — the legal agreement governing use of the platform.',
};

// ============ REUSABLE STYLE CONSTANTS ============
const STYLES = {
  heading1: 'text-3xl md:text-4xl font-extrabold text-[#e8e9ed] mb-6',
  heading2: 'text-xl md:text-2xl font-bold text-[#e8e9ed] mt-10 mb-4',
  heading3: 'text-lg font-semibold text-[#e8e9ed] mt-6 mb-3',
  paragraph: 'text-[#9ca0b0] text-sm leading-relaxed mb-4',
  list: 'list-disc list-inside text-[#9ca0b0] text-sm leading-relaxed mb-4 space-y-1.5 pl-2',
  orderedList: 'list-decimal list-inside text-[#9ca0b0] text-sm leading-relaxed mb-4 space-y-1.5 pl-2',
  link: 'text-[#4a7dff] hover:underline',
  sectionNumber: 'text-[#4a7dff] font-bold mr-2',
};

// ============ COMPONENT ============
export default function TermsOfServicePage() {
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
            <h1 className={STYLES.heading1}>Terms of Service</h1>
            <p className="text-[#6b7084] text-sm">
              Last Updated: March 2026
            </p>
            <p className={`${STYLES.paragraph} mt-4`}>
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) and 5FT View Consulting (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), governing your access to and use of the DueDrill platform, including the website at duedrill.com and all related applications, tools, APIs, and services (collectively, the &ldquo;Service&rdquo;).
            </p>
            <p className={STYLES.paragraph}>
              <strong className="text-[#e8e9ed]">PLEASE READ THESE TERMS CAREFULLY BEFORE USING THE SERVICE.</strong> By creating an account, accessing, or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our{' '}
              <Link href="/privacy" className={STYLES.link}>Privacy Policy</Link>, which is incorporated herein by reference. If you do not agree to these Terms, you must not access or use the Service.
            </p>
          </div>

          {/* ============ SECTION 1: ACCEPTANCE OF TERMS ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>1.</span>
            Acceptance of Terms
          </h2>
          <p className={STYLES.paragraph}>
            By accessing or using the Service, you represent and warrant that: (a) you are at least 18 years of age; (b) you have the legal capacity and authority to enter into these Terms; (c) if you are using the Service on behalf of an organization, you have the authority to bind that organization to these Terms; and (d) your use of the Service will comply with all applicable laws and regulations.
          </p>
          <p className={STYLES.paragraph}>
            We may update these Terms from time to time. If we make material changes, we will notify you by email or by posting a notice on the Service at least 30 days prior to the effective date. Your continued use of the Service after the effective date of any changes constitutes your acceptance of the revised Terms.
          </p>

          {/* ============ SECTION 2: DESCRIPTION OF SERVICE ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>2.</span>
            Description of Service
          </h2>
          <p className={STYLES.paragraph}>
            DueDrill is an AI-powered startup due diligence platform designed for venture capital investors, angel investors, family offices, and institutional investors. The Service provides:
          </p>
          <ul className={STYLES.list}>
            <li>A structured 16-category due diligence framework with 214 data points</li>
            <li>AI-powered company research using third-party AI providers (Perplexity, Anthropic/Claude, OpenAI/GPT-4, Groq)</li>
            <li>Proprietary weighted scoring engine for investment analysis</li>
            <li>Investment memo and report generation</li>
            <li>Multi-company portfolio tracking and management</li>
            <li>Data export and import capabilities</li>
            <li>Cloud synchronization (via Supabase) for team collaboration</li>
          </ul>
          <p className={STYLES.paragraph}>
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with reasonable notice for material changes.
          </p>

          {/* ============ SECTION 3: ACCOUNT REGISTRATION AND SECURITY ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>3.</span>
            Account Registration and Security
          </h2>
          <p className={STYLES.paragraph}>
            To access certain features of the Service, you must create an account. When registering, you agree to:
          </p>
          <ul className={STYLES.list}>
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and promptly update your account information to keep it accurate</li>
            <li>Maintain the security and confidentiality of your login credentials</li>
            <li>Accept responsibility for all activities that occur under your account</li>
            <li>Notify us immediately of any unauthorized access to or use of your account</li>
          </ul>
          <p className={STYLES.paragraph}>
            You are solely responsible for safeguarding your account credentials and any API keys you store in the Service. We are not liable for any losses arising from unauthorized use of your account resulting from your failure to protect your credentials.
          </p>
          <p className={STYLES.paragraph}>
            We reserve the right to suspend or terminate any account that we reasonably believe has been compromised, is being used in violation of these Terms, or has been inactive for more than 12 months.
          </p>

          {/* ============ SECTION 4: SUBSCRIPTION PLANS AND BILLING ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>4.</span>
            Subscription Plans and Billing
          </h2>

          <h3 className={STYLES.heading3}>4.1 Plans</h3>
          <p className={STYLES.paragraph}>
            The Service offers multiple subscription tiers, including a free tier and paid plans (Solo Investor, Fund, Enterprise). The features, pricing, and limitations of each plan are described on our pricing page and may be updated from time to time.
          </p>

          <h3 className={STYLES.heading3}>4.2 Payment Processing</h3>
          <p className={STYLES.paragraph}>
            All payments are processed securely through Stripe, our third-party payment processor. By subscribing to a paid plan, you authorize us to charge the payment method on file for the applicable fees. You agree to Stripe&apos;s terms of service in connection with payment processing.
          </p>

          <h3 className={STYLES.heading3}>4.3 Billing Cycle</h3>
          <p className={STYLES.paragraph}>
            Paid subscriptions are billed on a recurring monthly or annual basis, depending on your selected billing cycle. Fees are charged at the beginning of each billing period and are non-refundable except as expressly provided in these Terms or as required by applicable law.
          </p>

          <h3 className={STYLES.heading3}>4.4 Price Changes</h3>
          <p className={STYLES.paragraph}>
            We may change our subscription fees from time to time. Price changes will be communicated at least 30 days in advance and will take effect at the start of your next billing cycle. If you do not agree to a price change, you may cancel your subscription before the new price takes effect.
          </p>

          <h3 className={STYLES.heading3}>4.5 Cancellation and Refunds</h3>
          <p className={STYLES.paragraph}>
            You may cancel your subscription at any time through your account settings. Upon cancellation, you will retain access to your paid plan features through the end of your current billing period. We do not provide prorated refunds for partial billing periods. For annual subscriptions cancelled within the first 14 days, you may request a full refund by contacting{' '}
            <a href="mailto:yuri@5ftview.com" className={STYLES.link}>yuri@5ftview.com</a>.
          </p>

          {/* ============ SECTION 5: FREE TIER LIMITATIONS ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>5.</span>
            Free Tier
          </h2>
          <p className={STYLES.paragraph}>
            The Service offers a free tier with the following limitations:
          </p>
          <ul className={STYLES.list}>
            <li>Limited number of active company profiles</li>
            <li>Limited AI research queries per month</li>
            <li>Basic report generation features only</li>
            <li>No team collaboration or cloud sync features</li>
            <li>Community support only (no priority support)</li>
          </ul>
          <p className={STYLES.paragraph}>
            We reserve the right to modify the features and limitations of the free tier at any time. The free tier is provided at our discretion and may be discontinued with 30 days&apos; notice. We may impose additional restrictions on the free tier to prevent abuse.
          </p>

          {/* ============ SECTION 6: ACCEPTABLE USE POLICY ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>6.</span>
            Acceptable Use Policy
          </h2>
          <p className={STYLES.paragraph}>
            You agree to use the Service only for lawful purposes and in compliance with these Terms. You shall not:
          </p>
          <ul className={STYLES.list}>
            <li>Use the Service to conduct due diligence for purposes of insider trading, market manipulation, or any other illegal financial activity</li>
            <li>Attempt to gain unauthorized access to the Service, other users&apos; accounts, or any systems or networks connected to the Service</li>
            <li>Reverse engineer, decompile, disassemble, or otherwise attempt to discover the source code or algorithms of the Service</li>
            <li>Use automated scripts, bots, or scrapers to access the Service, except through our published APIs</li>
            <li>Resell, sublicense, or redistribute the Service or any output generated by the Service without our express written consent</li>
            <li>Use the Service to store or transmit malware, viruses, or other malicious code</li>
            <li>Use the Service in any way that could damage, disable, overburden, or impair our infrastructure</li>
            <li>Upload or transmit any content that is unlawful, defamatory, fraudulent, or infringes on the rights of others</li>
            <li>Circumvent or attempt to circumvent any usage limitations, rate limits, or security features of the Service</li>
            <li>Use the Service to generate content that constitutes regulated investment advice without appropriate licensure</li>
          </ul>
          <p className={STYLES.paragraph}>
            Violation of this Acceptable Use Policy may result in immediate suspension or termination of your account without notice or refund.
          </p>

          {/* ============ SECTION 7: INTELLECTUAL PROPERTY ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>7.</span>
            Intellectual Property
          </h2>

          <h3 className={STYLES.heading3}>7.1 Your Data</h3>
          <p className={STYLES.paragraph}>
            <strong className="text-[#e8e9ed]">You retain all ownership rights to the data you create, upload, or generate through the Service</strong>, including company research data, notes, scores, assessments, and investment memos. By using the Service, you grant us a limited, non-exclusive license to host, store, process, and display your data solely for the purpose of providing the Service to you. This license terminates when you delete your data or your account.
          </p>

          <h3 className={STYLES.heading3}>7.2 Our Platform</h3>
          <p className={STYLES.paragraph}>
            The Service, including all software, algorithms, scoring methodologies, user interface designs, trademarks, logos, and documentation, is the exclusive property of 5FT View Consulting and is protected by copyright, trademark, and other intellectual property laws. Nothing in these Terms grants you any right, title, or interest in the Service itself, except for the limited right to use the Service in accordance with these Terms.
          </p>

          <h3 className={STYLES.heading3}>7.3 Feedback</h3>
          <p className={STYLES.paragraph}>
            If you provide us with feedback, suggestions, or recommendations regarding the Service (&ldquo;Feedback&rdquo;), you grant us a perpetual, irrevocable, worldwide, royalty-free license to use, modify, and incorporate such Feedback into the Service without any obligation to you.
          </p>

          {/* ============ SECTION 8: AI-GENERATED CONTENT DISCLAIMER ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>8.</span>
            AI-Generated Content Disclaimer
          </h2>
          <div className="bg-[#1e2130] border border-[#f59e0b]/30 rounded-xl p-6 mb-4">
            <p className="text-[#f59e0b] font-bold text-sm mb-3">IMPORTANT NOTICE</p>
            <p className="text-[#9ca0b0] text-sm leading-relaxed mb-3">
              <strong className="text-[#e8e9ed]">The research, analysis, scores, and reports generated by DueDrill are for informational purposes only and do not constitute investment advice, financial advice, legal advice, or any professional advice.</strong>
            </p>
            <p className="text-[#9ca0b0] text-sm leading-relaxed">
              DueDrill utilizes third-party artificial intelligence models to generate research findings. You acknowledge and agree that:
            </p>
          </div>
          <ul className={STYLES.list}>
            <li>AI-generated research may contain inaccuracies, errors, outdated information, or omissions</li>
            <li>AI models may &ldquo;hallucinate&rdquo; — generating plausible-sounding but factually incorrect information</li>
            <li>Scores and assessments are generated using automated algorithms and should not be the sole basis for any investment decision</li>
            <li>All AI-generated content should be independently verified through your own due diligence processes</li>
            <li>The Service does not replace the need for professional legal, financial, or investment advice from qualified professionals</li>
            <li>Past performance data or analysis does not guarantee future results</li>
            <li>We are not registered as an investment adviser, broker-dealer, or financial planner with any regulatory authority</li>
          </ul>
          <p className={STYLES.paragraph}>
            <strong className="text-[#e8e9ed]">You assume full responsibility for any investment decisions made using information obtained through the Service.</strong> We strongly recommend consulting with qualified legal, financial, and investment professionals before making any investment decisions.
          </p>

          {/* ============ SECTION 9: DATA ACCURACY DISCLAIMER ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>9.</span>
            Data Accuracy Disclaimer
          </h2>
          <p className={STYLES.paragraph}>
            While we strive to provide high-quality research tools, we make no representations or warranties regarding the accuracy, completeness, reliability, or timeliness of any information generated by or available through the Service. Specifically:
          </p>
          <ul className={STYLES.list}>
            <li>Information sourced from AI providers depends on their training data, which may be incomplete or outdated</li>
            <li>Real-time web search results (via Perplexity) may reference sources that are themselves inaccurate</li>
            <li>Financial data, market statistics, and company information may not reflect the most current state of affairs</li>
            <li>The accuracy of research results varies by AI provider, query complexity, and available public information</li>
            <li>We do not independently verify the accuracy of AI-generated research outputs</li>
          </ul>
          <p className={STYLES.paragraph}>
            You are solely responsible for verifying the accuracy of any information obtained through the Service before relying on it for any purpose.
          </p>

          {/* ============ SECTION 10: LIMITATION OF LIABILITY ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>10.</span>
            Limitation of Liability
          </h2>
          <p className={STYLES.paragraph}>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
          </p>
          <ul className={STYLES.list}>
            <li><strong className="text-[#e8e9ed]">NO CONSEQUENTIAL DAMAGES:</strong> IN NO EVENT SHALL 5FT VIEW CONSULTING, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS OPPORTUNITY, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE SERVICE, REGARDLESS OF THE THEORY OF LIABILITY.</li>
            <li><strong className="text-[#e8e9ed]">INVESTMENT LOSSES:</strong> WE SHALL NOT BE LIABLE FOR ANY INVESTMENT LOSSES, FINANCIAL LOSSES, OR BUSINESS DECISIONS MADE IN RELIANCE ON INFORMATION OBTAINED THROUGH THE SERVICE.</li>
            <li><strong className="text-[#e8e9ed]">AGGREGATE LIABILITY CAP:</strong> OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE TOTAL FEES PAID BY YOU TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100).</li>
            <li><strong className="text-[#e8e9ed]">THIRD-PARTY SERVICES:</strong> WE SHALL NOT BE LIABLE FOR ANY DAMAGES ARISING FROM THE ACTIONS, OMISSIONS, OR FAILURES OF THIRD-PARTY SERVICE PROVIDERS, INCLUDING AI PROVIDERS, SUPABASE, OR STRIPE.</li>
          </ul>
          <p className={STYLES.paragraph}>
            Some jurisdictions do not allow the limitation or exclusion of liability for incidental or consequential damages, so the above limitations may not apply to you. In such jurisdictions, our liability is limited to the maximum extent permitted by law.
          </p>

          {/* ============ SECTION 11: INDEMNIFICATION ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>11.</span>
            Indemnification
          </h2>
          <p className={STYLES.paragraph}>
            You agree to indemnify, defend, and hold harmless 5FT View Consulting, its officers, directors, employees, agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or in connection with:
          </p>
          <ul className={STYLES.list}>
            <li>Your use of or access to the Service</li>
            <li>Your violation of these Terms or any applicable law or regulation</li>
            <li>Your violation of any third-party rights, including intellectual property rights</li>
            <li>Any investment decisions made based on information obtained through the Service</li>
            <li>Any content or data you upload, create, or transmit through the Service</li>
            <li>Your use of API keys or third-party services in connection with the Service</li>
          </ul>

          {/* ============ SECTION 12: TERMINATION ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>12.</span>
            Termination
          </h2>

          <h3 className={STYLES.heading3}>12.1 By You</h3>
          <p className={STYLES.paragraph}>
            You may terminate your account and these Terms at any time by deleting your account through the Service&apos;s account settings or by contacting us at{' '}
            <a href="mailto:yuri@5ftview.com" className={STYLES.link}>yuri@5ftview.com</a>. Upon termination, your right to use the Service will immediately cease.
          </p>

          <h3 className={STYLES.heading3}>12.2 By Us</h3>
          <p className={STYLES.paragraph}>
            We may suspend or terminate your account and access to the Service at any time, with or without cause, including if we reasonably believe that:
          </p>
          <ul className={STYLES.list}>
            <li>You have violated these Terms or our Acceptable Use Policy</li>
            <li>Your use of the Service poses a security risk to us or other users</li>
            <li>Your account has been involved in fraudulent or illegal activity</li>
            <li>We are required to do so by law or legal process</li>
          </ul>

          <h3 className={STYLES.heading3}>12.3 Effect of Termination</h3>
          <p className={STYLES.paragraph}>
            Upon termination: (a) all licenses and rights granted to you under these Terms will immediately cease; (b) you must cease all use of the Service; (c) you may request a copy of your data within 30 days of termination by contacting us; (d) after 30 days, we may delete your account data in accordance with our Privacy Policy. Sections that by their nature should survive termination (including Sections 7, 8, 9, 10, 11, 13, and 14) will survive.
          </p>

          {/* ============ SECTION 13: GOVERNING LAW ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>13.</span>
            Governing Law
          </h2>
          <p className={STYLES.paragraph}>
            These Terms and any dispute arising out of or in connection with these Terms or the Service shall be governed by and construed in accordance with the laws of the State of Delaware, United States of America, without regard to its conflict of laws principles.
          </p>

          {/* ============ SECTION 14: DISPUTE RESOLUTION ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>14.</span>
            Dispute Resolution
          </h2>

          <h3 className={STYLES.heading3}>14.1 Informal Resolution</h3>
          <p className={STYLES.paragraph}>
            Before initiating any formal dispute resolution proceedings, you agree to first attempt to resolve any dispute informally by contacting us at{' '}
            <a href="mailto:yuri@5ftview.com" className={STYLES.link}>yuri@5ftview.com</a>. We will attempt to resolve the dispute informally within 60 days.
          </p>

          <h3 className={STYLES.heading3}>14.2 Binding Arbitration</h3>
          <p className={STYLES.paragraph}>
            If we are unable to resolve a dispute informally, you and we agree that any dispute, claim, or controversy arising out of or relating to these Terms or the Service shall be resolved by binding arbitration administered by the American Arbitration Association (&ldquo;AAA&rdquo;) in accordance with its Commercial Arbitration Rules. The arbitration shall be conducted by a single arbitrator, in the English language, in Wilmington, Delaware (or remotely, at the arbitrator&apos;s discretion).
          </p>

          <h3 className={STYLES.heading3}>14.3 Class Action Waiver</h3>
          <p className={STYLES.paragraph}>
            <strong className="text-[#e8e9ed]">YOU AND WE AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION.</strong> If for any reason a claim proceeds in court rather than in arbitration, both you and we waive any right to a jury trial.
          </p>

          <h3 className={STYLES.heading3}>14.4 Exceptions</h3>
          <p className={STYLES.paragraph}>
            Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement, misappropriation, or violation of intellectual property rights.
          </p>

          {/* ============ SECTION 15: MODIFICATIONS TO TERMS ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>15.</span>
            Modifications to Terms
          </h2>
          <p className={STYLES.paragraph}>
            We reserve the right to modify these Terms at any time. When we make material changes, we will:
          </p>
          <ul className={STYLES.list}>
            <li>Update the &ldquo;Last Updated&rdquo; date at the top of this page</li>
            <li>Notify you via email at least 30 days before the changes take effect</li>
            <li>Display a prominent notice within the Service</li>
            <li>For material changes that affect your rights or obligations, we may require your affirmative acceptance of the revised Terms</li>
          </ul>
          <p className={STYLES.paragraph}>
            If you do not agree to the revised Terms, you must stop using the Service and may cancel your subscription. Your continued use of the Service after the effective date of revised Terms constitutes your acceptance of the changes.
          </p>

          {/* ============ SECTION 16: GENERAL PROVISIONS ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>16.</span>
            General Provisions
          </h2>
          <ul className={STYLES.list}>
            <li><strong className="text-[#e8e9ed]">Entire Agreement:</strong> These Terms, together with the Privacy Policy, constitute the entire agreement between you and us regarding the Service and supersede all prior agreements and understandings.</li>
            <li><strong className="text-[#e8e9ed]">Severability:</strong> If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</li>
            <li><strong className="text-[#e8e9ed]">Waiver:</strong> Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.</li>
            <li><strong className="text-[#e8e9ed]">Assignment:</strong> You may not assign or transfer these Terms without our prior written consent. We may assign these Terms without restriction.</li>
            <li><strong className="text-[#e8e9ed]">Force Majeure:</strong> We shall not be liable for any failure or delay in performance resulting from causes beyond our reasonable control, including natural disasters, war, terrorism, labor disputes, government actions, or internet service disruptions.</li>
            <li><strong className="text-[#e8e9ed]">Notices:</strong> We may provide notices to you via email to the address associated with your account. You may provide notices to us at{' '}
              <a href="mailto:yuri@5ftview.com" className={STYLES.link}>yuri@5ftview.com</a>.
            </li>
          </ul>

          {/* ============ SECTION 17: CONTACT INFORMATION ============ */}
          <h2 className={STYLES.heading2}>
            <span className={STYLES.sectionNumber}>17.</span>
            Contact Information
          </h2>
          <p className={STYLES.paragraph}>
            If you have any questions about these Terms of Service, please contact us:
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
              Governing Law: State of Delaware, USA
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
