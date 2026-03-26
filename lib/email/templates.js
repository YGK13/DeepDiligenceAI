// ============================================================================
// lib/email/templates.js — DueDrill: Welcome Sequence Email Templates
// ============================================================================
// Defines the 5-email drip sequence sent after user signup.
// Each email has: subject, preheader, htmlBody (inline CSS), textBody (plain text).
//
// DESIGN PRINCIPLES:
//   - Inline CSS only — email clients strip <style> tags and external sheets
//   - Clean, minimal layout: white background, DueDrill blue (#4a7dff) accents
//   - Short & scannable: 5-7 sentences max per email
//   - ONE clear CTA button per email
//   - Professional but warm — Yuri is a real person, not a corporate bot
//   - Unsubscribe link placeholder at bottom of every email
//
// USAGE:
//   import { WELCOME_SEQUENCE, FROM_ADDRESS, buildEmailHtml } from '@/lib/email/templates';
//   const email = WELCOME_SEQUENCE[0]; // Day 0 welcome email
//   const html = buildEmailHtml(email, { userName: 'Jane' });
// ============================================================================

// ============================================================================
// BRAND CONSTANTS
// ============================================================================
// Centralized so every email stays on-brand without hunting through markup.
const BRAND = {
  name: 'DueDrill',
  color: '#4a7dff',       // Primary blue — used for buttons, accents, links
  colorDark: '#3a65d4',   // Darker blue for button hover (some clients support it)
  bgLight: '#f8f9fc',     // Light gray for section backgrounds
  textDark: '#1a1a2e',    // Near-black for body text — better than pure #000
  textMuted: '#6b7280',   // Gray for secondary text, footers, preheaders
  appUrl: 'https://duedrill.com',
  pricingUrl: 'https://duedrill.com/pricing',
  logoText: 'DueDrill',   // Text fallback — no image logo to avoid spam filters
};

// ============================================================================
// FROM ADDRESS
// ============================================================================
// Single source of truth for the sender identity across all welcome emails.
export const FROM_ADDRESS = 'Yuri from DueDrill <yuri@duedrill.com>';

// ============================================================================
// HTML WRAPPER
// ============================================================================
// Wraps every email body in a consistent layout shell.
// Uses table-based layout because that's what email clients actually render.
// {{BODY}} is replaced with the specific email content.
// {{USER_NAME}} is personalized per recipient.
// {{UNSUBSCRIBE_URL}} is replaced at send time with the actual unsubscribe link.
function wrapHtml(bodyContent, subject) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f7; font-family:Arial, Helvetica, sans-serif; -webkit-font-smoothing:antialiased;">
  <!-- Outer wrapper table — full-width gray background -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <!-- Inner content table — 600px max, white card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; max-width:600px; width:100%;">
          <!-- Header bar — DueDrill blue stripe -->
          <tr>
            <td style="background-color:${BRAND.color}; padding:24px 32px;">
              <span style="font-size:22px; font-weight:bold; color:#ffffff; text-decoration:none;">${BRAND.logoText}</span>
            </td>
          </tr>
          <!-- Email body -->
          <tr>
            <td style="padding:32px; color:${BRAND.textDark}; font-size:15px; line-height:1.65;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px; background-color:${BRAND.bgLight}; text-align:center; border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 8px; font-size:13px; color:${BRAND.textMuted};">
                DueDrill — AI-Powered Due Diligence for Smarter Investments
              </p>
              <p style="margin:0; font-size:12px; color:${BRAND.textMuted};">
                <a href="{{UNSUBSCRIBE_URL}}" style="color:${BRAND.textMuted}; text-decoration:underline;">Unsubscribe</a>
                &nbsp;|&nbsp;
                <a href="${BRAND.appUrl}" style="color:${BRAND.textMuted}; text-decoration:underline;">Open DueDrill</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// CTA BUTTON HELPER
// ============================================================================
// Generates an inline-styled button that works across email clients.
// Uses the bulletproof button technique (padding on <a> tag).
function ctaButton(text, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td align="center" style="border-radius:6px; background-color:${BRAND.color};">
      <a href="${url}" target="_blank" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:6px; background-color:${BRAND.color};">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

// ============================================================================
// WELCOME SEQUENCE — 5 EMAILS
// ============================================================================
// Array indexed 0–4. Each entry is a complete email definition.
// delayDays = how many days after signup this email fires.
// templateId matches the array index for easy lookup.
export const WELCOME_SEQUENCE = [
  // ============================================================================
  // EMAIL 0 — Day 0: Welcome to DueDrill
  // ============================================================================
  // Fires immediately after signup. Quick orientation, link to app, mention demo.
  {
    templateId: 0,
    delayDays: 0,
    subject: 'Welcome to DueDrill — let\'s make your next investment decision easier',
    preheader: 'Your AI-powered due diligence toolkit is ready. Here\'s how to get started in 2 minutes.',
    htmlBody: wrapHtml(`
      <p style="margin:0 0 16px; font-size:17px; font-weight:bold; color:${BRAND.textDark};">
        Hey {{USER_NAME}}, welcome aboard!
      </p>
      <p style="margin:0 0 16px;">
        I'm Yuri, the founder of DueDrill. Thanks for signing up — you just saved yourself hundreds of hours of manual due diligence work.
      </p>
      <p style="margin:0 0 16px;">
        DueDrill uses AI to research companies across 15 critical sections — financials, team, market, competition, legal risks, and more — then scores them so you can make faster, smarter investment decisions.
      </p>
      <p style="margin:0 0 8px; font-weight:bold;">Here's the fastest way to get started:</p>
      <ol style="margin:0 0 16px; padding-left:20px;">
        <li style="margin-bottom:6px;">Open the app and check out the <strong>demo company</strong> — it's pre-loaded so you can see what a full analysis looks like.</li>
        <li style="margin-bottom:6px;">Try adding your own company — just paste a name or website URL.</li>
        <li style="margin-bottom:6px;">Watch the AI auto-fill all 15 sections in real time.</li>
      </ol>
      ${ctaButton('Open DueDrill →', BRAND.appUrl)}
      <p style="margin:0; color:${BRAND.textMuted}; font-size:13px;">
        Reply to this email anytime — I read every message personally.
      </p>
    `, 'Welcome to DueDrill — let\'s make your next investment decision easier'),
    textBody: `Hey {{USER_NAME}}, welcome aboard!

I'm Yuri, the founder of DueDrill. Thanks for signing up — you just saved yourself hundreds of hours of manual due diligence work.

DueDrill uses AI to research companies across 15 critical sections — financials, team, market, competition, legal risks, and more — then scores them so you can make faster, smarter investment decisions.

Here's the fastest way to get started:
1. Open the app and check out the demo company — it's pre-loaded so you can see what a full analysis looks like.
2. Try adding your own company — just paste a name or website URL.
3. Watch the AI auto-fill all 15 sections in real time.

Open DueDrill: ${BRAND.appUrl}

Reply to this email anytime — I read every message personally.

—
Yuri from DueDrill
Unsubscribe: {{UNSUBSCRIBE_URL}}`,
  },

  // ============================================================================
  // EMAIL 1 — Day 1: How AI Auto-Fill Works
  // ============================================================================
  // Sent 1 day after signup. Explains the AI research engine and confidence scores.
  {
    templateId: 1,
    delayDays: 1,
    subject: 'How DueDrill\'s AI researches a company in 60 seconds',
    preheader: '15 sections, confidence indicators, and how to review AI-generated research like a pro.',
    htmlBody: wrapHtml(`
      <p style="margin:0 0 16px; font-size:17px; font-weight:bold; color:${BRAND.textDark};">
        {{USER_NAME}}, here's what happens when you hit "Auto-Fill"
      </p>
      <p style="margin:0 0 16px;">
        When you add a company, DueDrill's AI engine researches <strong>15 due diligence sections</strong> simultaneously — team background, product analysis, market sizing, financial health, legal risks, competitive landscape, and more.
      </p>
      <p style="margin:0 0 16px;">
        Each section shows a <strong>confidence indicator</strong> so you know how reliable the data is. High confidence means the AI found strong, corroborated sources. Lower confidence means you should verify manually — we flag exactly what needs your attention.
      </p>
      <p style="margin:0 0 8px; font-weight:bold;">How to get the best results:</p>
      <ul style="margin:0 0 16px; padding-left:20px;">
        <li style="margin-bottom:6px;">Review each section — click to expand and see the AI's sources.</li>
        <li style="margin-bottom:6px;">Edit any field inline — your edits override the AI and are saved.</li>
        <li style="margin-bottom:6px;">Re-run auto-fill on individual sections if you want a fresh analysis.</li>
      </ul>
      ${ctaButton('Try Auto-Fill Now →', BRAND.appUrl)}
      <p style="margin:0; color:${BRAND.textMuted}; font-size:13px;">
        Pro tip: The more specific the company URL, the better the AI results.
      </p>
    `, 'How DueDrill\'s AI researches a company in 60 seconds'),
    textBody: `{{USER_NAME}}, here's what happens when you hit "Auto-Fill"

When you add a company, DueDrill's AI engine researches 15 due diligence sections simultaneously — team background, product analysis, market sizing, financial health, legal risks, competitive landscape, and more.

Each section shows a confidence indicator so you know how reliable the data is. High confidence means the AI found strong, corroborated sources. Lower confidence means you should verify manually — we flag exactly what needs your attention.

How to get the best results:
- Review each section — click to expand and see the AI's sources.
- Edit any field inline — your edits override the AI and are saved.
- Re-run auto-fill on individual sections if you want a fresh analysis.

Try Auto-Fill Now: ${BRAND.appUrl}

Pro tip: The more specific the company URL, the better the AI results.

—
Yuri from DueDrill
Unsubscribe: {{UNSUBSCRIBE_URL}}`,
  },

  // ============================================================================
  // EMAIL 2 — Day 3: Your First Investment Memo
  // ============================================================================
  // Sent 3 days after signup. Walks through PDF export and scoring methodology.
  {
    templateId: 2,
    delayDays: 3,
    subject: 'Turn your research into a shareable investment memo',
    preheader: 'Export a professional PDF memo in one click. Here\'s how scoring works.',
    htmlBody: wrapHtml(`
      <p style="margin:0 0 16px; font-size:17px; font-weight:bold; color:${BRAND.textDark};">
        {{USER_NAME}}, your research deserves a polished memo
      </p>
      <p style="margin:0 0 16px;">
        Once you've reviewed a company's analysis, DueDrill can export a <strong>professional investment memo as a PDF</strong> — ready to share with partners, your IC, or your own records.
      </p>
      <p style="margin:0 0 16px;">
        Every memo includes the company's <strong>overall DueDrill Score</strong> — a weighted composite across all 15 sections. Scores above 70 indicate strong fundamentals. Below 50 flags serious concerns. The scoring methodology weights financials and team quality more heavily, because that's what predicts outcomes.
      </p>
      <p style="margin:0 0 8px; font-weight:bold;">What a great score looks like:</p>
      <ul style="margin:0 0 16px; padding-left:20px;">
        <li style="margin-bottom:6px;"><strong>80+</strong> — Exceptional. Strong across all dimensions.</li>
        <li style="margin-bottom:6px;"><strong>60–79</strong> — Solid. Some areas need deeper digging.</li>
        <li style="margin-bottom:6px;"><strong>Below 60</strong> — Proceed with caution. Significant gaps flagged.</li>
      </ul>
      ${ctaButton('Export Your First Memo →', BRAND.appUrl)}
      <p style="margin:0; color:${BRAND.textMuted}; font-size:13px;">
        Your memo, your brand — we never watermark or gate your exports.
      </p>
    `, 'Turn your research into a shareable investment memo'),
    textBody: `{{USER_NAME}}, your research deserves a polished memo

Once you've reviewed a company's analysis, DueDrill can export a professional investment memo as a PDF — ready to share with partners, your IC, or your own records.

Every memo includes the company's overall DueDrill Score — a weighted composite across all 15 sections. Scores above 70 indicate strong fundamentals. Below 50 flags serious concerns. The scoring methodology weights financials and team quality more heavily, because that's what predicts outcomes.

What a great score looks like:
- 80+ — Exceptional. Strong across all dimensions.
- 60-79 — Solid. Some areas need deeper digging.
- Below 60 — Proceed with caution. Significant gaps flagged.

Export Your First Memo: ${BRAND.appUrl}

Your memo, your brand — we never watermark or gate your exports.

—
Yuri from DueDrill
Unsubscribe: {{UNSUBSCRIBE_URL}}`,
  },

  // ============================================================================
  // EMAIL 3 — Day 7: Power Features
  // ============================================================================
  // Sent 7 days after signup. Highlights Crunchbase import, deck analysis, pipeline.
  {
    templateId: 3,
    delayDays: 7,
    subject: 'Power features you haven\'t tried yet',
    preheader: 'Crunchbase import, pitch deck analysis, and pipeline view — all in DueDrill.',
    htmlBody: wrapHtml(`
      <p style="margin:0 0 16px; font-size:17px; font-weight:bold; color:${BRAND.textDark};">
        {{USER_NAME}}, time to unlock the full toolkit
      </p>
      <p style="margin:0 0 16px;">
        You've been using DueDrill for a week now — here are three features that our power users love and that will take your workflow to the next level.
      </p>
      <p style="margin:0 0 8px; font-weight:bold;">
        <span style="color:${BRAND.color};">1.</span> Crunchbase Import
      </p>
      <p style="margin:0 0 16px;">
        Paste a Crunchbase URL and DueDrill pulls in funding history, team profiles, and key metrics automatically. No more copy-pasting between tabs.
      </p>
      <p style="margin:0 0 8px; font-weight:bold;">
        <span style="color:${BRAND.color};">2.</span> Pitch Deck Cross-Check
      </p>
      <p style="margin:0 0 16px;">
        Upload a startup's pitch deck and DueDrill compares their claims against independent research. Spot inflated metrics and missing context instantly.
      </p>
      <p style="margin:0 0 8px; font-weight:bold;">
        <span style="color:${BRAND.color};">3.</span> Pipeline View
      </p>
      <p style="margin:0 0 16px;">
        Track all your companies in one dashboard — sort by score, stage, or date. See your entire deal flow at a glance.
      </p>
      ${ctaButton('Explore Power Features →', BRAND.appUrl)}
    `, 'Power features you haven\'t tried yet'),
    textBody: `{{USER_NAME}}, time to unlock the full toolkit

You've been using DueDrill for a week now — here are three features that our power users love and that will take your workflow to the next level.

1. Crunchbase Import
Paste a Crunchbase URL and DueDrill pulls in funding history, team profiles, and key metrics automatically. No more copy-pasting between tabs.

2. Pitch Deck Cross-Check
Upload a startup's pitch deck and DueDrill compares their claims against independent research. Spot inflated metrics and missing context instantly.

3. Pipeline View
Track all your companies in one dashboard — sort by score, stage, or date. See your entire deal flow at a glance.

Explore Power Features: ${BRAND.appUrl}

—
Yuri from DueDrill
Unsubscribe: {{UNSUBSCRIBE_URL}}`,
  },

  // ============================================================================
  // EMAIL 4 — Day 14: Ready to Upgrade?
  // ============================================================================
  // Sent 14 days after signup. Compares Free vs Solo vs Fund plans with clear CTA.
  {
    templateId: 4,
    delayDays: 14,
    subject: 'You\'ve been using DueDrill for 2 weeks — here\'s what you\'re missing',
    preheader: 'Compare Free, Solo, and Fund plans. See which features unlock at each tier.',
    htmlBody: wrapHtml(`
      <p style="margin:0 0 16px; font-size:17px; font-weight:bold; color:${BRAND.textDark};">
        {{USER_NAME}}, you've been doing great work in DueDrill
      </p>
      <p style="margin:0 0 16px;">
        Over the past two weeks you've gotten a feel for AI-powered due diligence. Here's a quick look at what's available on each plan — and what you'll unlock by upgrading.
      </p>
      <!-- Plan comparison table — inline styles for email client compatibility -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 24px; border:1px solid #e5e7eb; border-radius:6px; overflow:hidden; font-size:14px;">
        <tr style="background-color:${BRAND.bgLight};">
          <td style="padding:10px 14px; font-weight:bold; border-bottom:1px solid #e5e7eb;">Feature</td>
          <td style="padding:10px 14px; font-weight:bold; border-bottom:1px solid #e5e7eb; text-align:center;">Free</td>
          <td style="padding:10px 14px; font-weight:bold; border-bottom:1px solid #e5e7eb; text-align:center; color:${BRAND.color};">Solo</td>
          <td style="padding:10px 14px; font-weight:bold; border-bottom:1px solid #e5e7eb; text-align:center; color:${BRAND.color};">Fund</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0;">Companies analyzed</td>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0; text-align:center;">3</td>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0; text-align:center;">Unlimited</td>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0; text-align:center;">Unlimited</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0;">PDF memo export</td>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0; text-align:center;">1/month</td>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0; text-align:center;">Unlimited</td>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0; text-align:center;">Unlimited</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0;">Deck analysis</td>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0; text-align:center;">—</td>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0; text-align:center;">Yes</td>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0; text-align:center;">Yes</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0;">Crunchbase import</td>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0; text-align:center;">—</td>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0; text-align:center;">Yes</td>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0; text-align:center;">Yes</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0;">Pipeline view</td>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0; text-align:center;">—</td>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0; text-align:center;">—</td>
          <td style="padding:10px 14px; border-bottom:1px solid #f0f0f0; text-align:center;">Yes</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;">Team collaboration</td>
          <td style="padding:10px 14px; text-align:center;">—</td>
          <td style="padding:10px 14px; text-align:center;">—</td>
          <td style="padding:10px 14px; text-align:center;">Yes</td>
        </tr>
      </table>
      <p style="margin:0 0 16px;">
        Most users who upgrade tell me the same thing: "I should have done this on day one." Unlimited analyses and PDF exports alone pay for themselves on your next deal.
      </p>
      ${ctaButton('See Plans & Pricing →', BRAND.pricingUrl)}
      <p style="margin:0; color:${BRAND.textMuted}; font-size:13px;">
        Questions about which plan fits? Just reply — I'll help you figure it out.
      </p>
    `, 'You\'ve been using DueDrill for 2 weeks — here\'s what you\'re missing'),
    textBody: `{{USER_NAME}}, you've been doing great work in DueDrill

Over the past two weeks you've gotten a feel for AI-powered due diligence. Here's a quick look at what's available on each plan:

FREE: 3 companies, 1 PDF export/month
SOLO: Unlimited companies, unlimited exports, deck analysis, Crunchbase import
FUND: Everything in Solo + pipeline view, team collaboration

Most users who upgrade tell me the same thing: "I should have done this on day one." Unlimited analyses and PDF exports alone pay for themselves on your next deal.

See Plans & Pricing: ${BRAND.pricingUrl}

Questions about which plan fits? Just reply — I'll help you figure it out.

—
Yuri from DueDrill
Unsubscribe: {{UNSUBSCRIBE_URL}}`,
  },
];

// ============================================================================
// PERSONALIZATION HELPER
// ============================================================================
// Replaces template placeholders with actual user data.
// Called at send time to produce final email content.
//
// Supported placeholders:
//   {{USER_NAME}}       — recipient's first name or display name
//   {{UNSUBSCRIBE_URL}} — link to unsubscribe (generated per-user)
export function personalizeEmail(template, { userName = 'there', unsubscribeUrl = '#unsubscribe' } = {}) {
  const replacePlaceholders = (str) =>
    str
      .replace(/\{\{USER_NAME\}\}/g, userName)
      .replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubscribeUrl);

  return {
    ...template,
    subject: replacePlaceholders(template.subject),
    preheader: replacePlaceholders(template.preheader),
    htmlBody: replacePlaceholders(template.htmlBody),
    textBody: replacePlaceholders(template.textBody),
  };
}
