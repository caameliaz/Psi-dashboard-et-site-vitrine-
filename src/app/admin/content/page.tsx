'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ContentPage() {
  const [content, setContent] = useState({
    hero_title: 'Welcome to PSI',
    hero_subtitle: 'Premium thermal paper solutions',
    about_text: 'PSI provides high-quality thermal paper...',
    contact_address: 'Algeria',
    contact_email: 'info@psi.dz',
    contact_phone: '+213 XXXX XXXX',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setContent({
      ...content,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });

      if (!res.ok) throw new Error('Failed to update content');
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-900 mb-8">Site Content</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="bg-white p-6 rounded-lg border border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Hero Section</h2>

          <Input
            label="Hero Title"
            name="hero_title"
            value={content.hero_title}
            onChange={handleChange}
            className="mb-4"
          />

          <Input
            label="Hero Subtitle"
            name="hero_subtitle"
            value={content.hero_subtitle}
            onChange={handleChange}
          />
        </div>

        <div className="bg-white p-6 rounded-lg border border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">About</h2>

          <div>
            <label className="text-sm font-medium text-zinc-900">About Text</label>
            <textarea
              name="about_text"
              value={content.about_text}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Contact Info</h2>

          <Input
            label="Address"
            name="contact_address"
            value={content.contact_address}
            onChange={handleChange}
            className="mb-4"
          />

          <Input
            label="Email"
            name="contact_email"
            type="email"
            value={content.contact_email}
            onChange={handleChange}
            className="mb-4"
          />

          <Input
            label="Phone"
            name="contact_phone"
            value={content.contact_phone}
            onChange={handleChange}
          />
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-900 px-4 py-3 rounded">
            Content updated successfully
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Content'}
        </Button>
      </form>
    </div>
  );
}
