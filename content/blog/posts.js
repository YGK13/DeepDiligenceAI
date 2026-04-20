// ============================================================================
// BLOG POSTS REGISTRY — DueDrill
// ============================================================================

export const POSTS = [
  {
    slug: "ai-due-diligence-checklist-emerging-fund-managers",
    title: "The AI Due Diligence Checklist for Emerging Fund Managers",
    description:
      "Complete 16-category due diligence checklist for emerging fund managers. 214 data fields. How AI accelerates each category.",
    keywords: "vc due diligence checklist, startup due diligence, ai due diligence tool, emerging manager due diligence",
    date: "2026-04-15",
    readingTime: "15 min read",
    category: "Due Diligence",
  },
  {
    slug: "pitchbook-vs-crunchbase-vs-duedrill",
    title: "PitchBook vs. Crunchbase vs. DueDrill: Which Due Diligence Tool Is Right for Your Fund?",
    description:
      "Side-by-side comparison of PitchBook ($12K+/yr), Crunchbase ($99/mo), and DueDrill ($199/mo) for emerging fund managers. Pricing, features, and when to use each.",
    keywords: "pitchbook alternative, crunchbase vs pitchbook, due diligence tools for small funds, pitchbook pricing 2026",
    date: "2026-04-18",
    readingTime: "12 min read",
    category: "Comparison",
  },
];

export function getPost(slug) {
  return POSTS.find((p) => p.slug === slug);
}

export function getAllPostsSorted() {
  return [...POSTS].sort((a, b) => new Date(b.date) - new Date(a.date));
}
