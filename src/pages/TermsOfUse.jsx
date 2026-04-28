import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const sections = [
  {
    title: '1. Acceptance of Terms',
    content: `By downloading, installing, or using the CueOut application, you agree to be bound by these Terms of Use. If you do not agree to these terms, do not use the app. We reserve the right to update these terms at any time, and your continued use of the app constitutes acceptance of those changes.`,
  },
  {
    title: '2. Use of the Service',
    content: `CueOut is provided for personal, non-commercial use. You agree to use the service only for lawful purposes and in a manner that does not infringe the rights of others. You may not use CueOut to:\n\n• Harass, stalk, or harm any person\n• Impersonate any person or entity\n• Engage in any fraudulent or deceptive activity\n• Violate any applicable local, national, or international law`,
  },
  {
    title: '3. Account Registration',
    content: `To use certain features of CueOut you must register for an account. You agree to provide accurate, current, and complete information during registration and to keep your account information up to date. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.`,
  },
  {
    title: '4. Subscriptions and Billing',
    content: `CueOut offers both free and paid subscription tiers. Paid subscriptions are billed on a recurring basis through your Apple ID. You can manage or cancel your subscription at any time via iPhone Settings → Apple ID → Subscriptions. Refunds are handled in accordance with Apple's refund policies. We reserve the right to change subscription pricing with reasonable notice.`,
  },
  {
    title: '5. Intellectual Property',
    content: `All content, features, and functionality of CueOut — including but not limited to text, graphics, logos, icons, and software — are the exclusive property of CueOut and are protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written consent.`,
  },
  {
    title: '6. Disclaimer of Warranties',
    content: `CueOut is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the service will be uninterrupted, error-free, or free of viruses or other harmful components. Use of the service is at your sole risk.`,
  },
  {
    title: '7. Limitation of Liability',
    content: `To the fullest extent permitted by law, CueOut shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the service. Our total liability to you for any claims shall not exceed the amount you paid to us in the twelve months preceding the claim.`,
  },
  {
    title: '8. Termination',
    content: `We reserve the right to suspend or terminate your account at any time for any reason, including if we believe you have violated these Terms of Use. Upon termination, your right to use the service will immediately cease. Provisions of these terms that by their nature should survive termination shall survive.`,
  },
  {
    title: '9. Governing Law',
    content: `These Terms of Use shall be governed by and construed in accordance with applicable law. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts in the applicable jurisdiction.`,
  },
  {
    title: '10. Contact',
    content: `If you have any questions about these Terms of Use, please contact us through the Support section of the app.`,
  },
];

export default function TermsOfUse() {
  const navigate = useNavigate();

  useEffect(() => { document.getElementById('scroll-container')?.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-full bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 pt-safe bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white">Terms of Use</h1>
        </div>
      </div>

      <div className="px-5 pt-6 pb-12 max-w-lg mx-auto">
        <p className="text-xs text-zinc-500 mb-6">Last updated: [Date pending] — Placeholder content only.</p>

        <div className="space-y-6">
          {sections.map(({ title, content }) => (
            <div key={title}>
              <h2 className="font-semibold text-white text-sm mb-2">{title}</h2>
              <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{content}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <p className="text-xs text-zinc-500 text-center leading-relaxed">
            This is placeholder content. The final Terms of Use will be provided by the client.
          </p>
        </div>
      </div>
    </div>
  );
}
