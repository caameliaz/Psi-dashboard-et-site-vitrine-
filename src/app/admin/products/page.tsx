'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface Product {
  id: string;
  reference: string;
  width: number;
  length: number;
  usage: string;
  price: number;
  categoryId: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load products:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading products...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Products</h1>
        <Button onClick={() => setIsModalOpen(true)}>Add Product</Button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Product"
      >
        <div className="space-y-4">
          <Input label="Reference" placeholder="e.g., 80/80" />
          <Input label="Width (mm)" type="number" />
          <Input label="Length (m)" type="number" />
          <Input label="Usage" placeholder="e.g., Retail shops" />
          <Input label="Price" type="number" step="0.01" />
          <Button>Create Product</Button>
        </div>
      </Modal>

      <div className="bg-white rounded-lg border border-zinc-200">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900">
                Reference
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900">
                Dimensions
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900">
                Price
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b hover:bg-zinc-50">
                <td className="px-6 py-4 text-sm text-zinc-900">{product.reference}</td>
                <td className="px-6 py-4 text-sm text-zinc-600">
                  {product.width}mm × {product.length}m
                </td>
                <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                  ${product.price}
                </td>
                <td className="px-6 py-4 text-sm">
                  <Button variant="secondary" size="sm">
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="text-center py-12 text-zinc-600">No products yet</div>
        )}
      </div>
    </div>
  );
}
