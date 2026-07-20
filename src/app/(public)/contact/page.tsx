'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export default function ContactPage() {
  const { t } = useTranslation();
  const [content, setContent] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/content').then(r => r.ok ? r.json() : {}).then(setContent).catch(() => {});
  }, []);

  const telephone = content['contact_telephone'] ?? '+213770150656';
  const email     = content['contact_email']     ?? 'Contact@psi.dz';
  const adresse   = content['contact_adresse']   ?? 'Centre El Qods, Niveau M1, Chéraga, Alger';

  const whatsappNumber = telephone.replace(/\D/g, '').replace(/^0/, '213');
  const WHATSAPP_MSG   = encodeURIComponent(t('common.whatsapp_msg'));

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-12 px-6">
      <div className="max-w-[600px] mx-auto">

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#717171] text-[14px] hover:text-[#263238] transition-colors mb-8"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('contact.back')}
        </Link>

        <h1 className="text-[36px] md:text-[42px] font-bold text-[#263238] mb-2">{t('contact.title')}</h1>
        <p className="text-[16px] text-[#717171] mb-10">{t('contact.subtitle')}</p>

        {/* Boutons de contact */}
        <div className="flex flex-col gap-4 mb-10">

          {/* WhatsApp */}
          <a
            href={`https://wa.me/${whatsappNumber}?text=${WHATSAPP_MSG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-5 bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-6 hover:shadow-[0_8px_32px_rgba(171,190,209,0.5)] transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#25D366' }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.663 4.61 1.816 6.51L4 29l7.697-1.794A12.94 12.94 0 0016 28c6.627 0 12-5.373 12-12S22.627 3 16 3z" fill="white"/>
                <path d="M22.5 19.5c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.2-.24-.57-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.02 1-1.02 2.43s1.05 2.82 1.2 3.02c.15.2 2.06 3.15 5 4.42.7.3 1.24.48 1.67.62.7.22 1.34.19 1.84.12.56-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" fill="#25D366"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[17px] font-bold text-[#263238]">{t('contact.whatsapp')}</p>
              <p className="text-[14px] text-[#717171] mt-0.5">{telephone}</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[#ABBED1] group-hover:text-[#4CAF4F] transition-colors">
              <path d="M5 10h10M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>

          {/* Téléphone */}
          <a
            href={`tel:${telephone}`}
            className="flex items-center gap-5 bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-6 hover:shadow-[0_8px_32px_rgba(171,190,209,0.5)] transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C9.61 21 3 14.39 3 6a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[17px] font-bold text-[#263238]">{t('contact.call')}</p>
              <p className="text-[14px] text-[#717171] mt-0.5">{telephone}</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[#ABBED1] group-hover:text-[#3B82F6] transition-colors">
              <path d="M5 10h10M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>

          {/* Email */}
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-5 bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-6 hover:shadow-[0_8px_32px_rgba(171,190,209,0.5)] transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#FFF7ED] flex items-center justify-center shrink-0">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 6l-10 7L2 6" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[17px] font-bold text-[#263238]">{t('contact.email_label')}</p>
              <p className="text-[14px] text-[#717171] mt-0.5">{email}</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[#ABBED1] group-hover:text-[#F97316] transition-colors">
              <path d="M5 10h10M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* Adresse */}
        <div className="flex items-start gap-3 text-[14px] text-[#717171] mb-10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="#ABBED1" strokeWidth="1.8"/>
            <circle cx="12" cy="10" r="3" stroke="#ABBED1" strokeWidth="1.8"/>
          </svg>
          <a href={`https://maps.google.com/?q=${encodeURIComponent(adresse)}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#263238] transition-colors underline underline-offset-2">{adresse}</a>
        </div>

        {/* CTA Devis */}
        <div className="bg-[#4CAF4F] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-[16px] font-bold text-white">{t('contact.quote_cta_title')}</p>
            <p className="text-[13px] text-[#E8F5E9] mt-1">{t('contact.quote_cta_sub')}</p>
          </div>
          <Link
            href="/quote"
            className="shrink-0 bg-white text-[#4CAF4F] text-[14px] font-bold px-6 py-3 rounded-xl hover:bg-[#F5F7FA] transition-colors whitespace-nowrap"
          >
            {t('contact.quote_cta_btn')}
          </Link>
        </div>

      </div>
    </div>
  );
}
