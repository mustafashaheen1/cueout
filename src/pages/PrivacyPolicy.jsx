import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const sections = [
  {
    title: '1. Information We Collect',
    content: `We collect information you provide directly to us, such as when you create an account, update your profile, or contact us for support. This includes your name, email address, phone number, and any other information you choose to provide.\n\nWe also automatically collect certain information when you use our services, including log data, device information, and usage data such as the features you use and the time spent on the app.`,
  },
  {
    title: '2. How We Use Your Information',
    content: `We use the information we collect to:\n\n• Provide, maintain, and improve our services\n• Process transactions and send related information\n• Send you technical notices and support messages\n• Respond to your comments and questions\n• Monitor and analyse usage patterns and trends\n• Detect and prevent fraudulent or abusive activity`,
  },
  {
    title: '3. Sharing of Information',
    content: `We do not sell, trade, or otherwise transfer your personal information to outside parties. This does not include trusted third parties who assist us in operating our app, conducting our business, or servicing you, as long as those parties agree to keep this information confidential.\n\nWe may release your information when we believe it is appropriate to comply with the law, enforce our site policies, or protect ours or others' rights, property, or safety.`,
  },
  {
    title: '4. Data Retention',
    content: `We retain your personal information for as long as your account is active or as needed to provide you services. You may delete your account at any time, and we will delete your personal information within 30 days of account deletion, except where we are required by law to retain it longer.`,
  },
  {
    title: '5. Security',
    content: `We take reasonable measures to help protect your personal information from loss, theft, misuse, and unauthorised access. However, no security system is impenetrable, and we cannot guarantee the security of our systems 100%. In the event of a breach, we will notify you in accordance with applicable law.`,
  },
  {
    title: '6. Children\'s Privacy',
    content: `CueOut is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided us with personal information, we will promptly delete such information from our servers.`,
  },
  {
    title: '7. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date. Your continued use of the app after we make changes indicates your acceptance of those changes.`,
  },
  {
    title: '8. Contact Us',
    content: `If you have any questions about this Privacy Policy, please contact us through the Support section of the app or at the contact details provided on our website.`,
  },
];

export default function PrivacyPolicy() {
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
          <h1 className="text-lg font-bold text-white">Privacy Policy</h1>
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
            This is placeholder content. The final Privacy Policy will be provided by the client.
          </p>
        </div>
      </div>
    </div>
  );
}
