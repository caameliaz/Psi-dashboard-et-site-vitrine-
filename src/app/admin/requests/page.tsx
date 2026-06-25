'use client';

import { useState } from 'react';

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'quotes'>('orders');

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-900 mb-8">Orders & Quotes</h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            activeTab === 'orders'
              ? 'bg-zinc-900 text-white'
              : 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => setActiveTab('quotes')}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            activeTab === 'quotes'
              ? 'bg-zinc-900 text-white'
              : 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50'
          }`}
        >
          Quotes
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg border border-zinc-200">
        {activeTab === 'orders' ? (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Orders</h2>
            <div className="text-center text-zinc-600 py-12">No orders yet</div>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Quotes</h2>
            <div className="text-center text-zinc-600 py-12">No quotes yet</div>
          </div>
        )}
      </div>
    </div>
  );
}
