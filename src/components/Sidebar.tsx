import Link from 'next/link';

export function Sidebar() {
  return (
    <aside className="w-64 bg-zinc-900 text-white">
      <div className="p-6">
        <Link href="/admin/dashboard" className="font-bold text-xl">
          PSI Admin
        </Link>
      </div>
      <nav className="space-y-2 px-4">
        <Link
          href="/admin/dashboard"
          className="block px-4 py-2 rounded hover:bg-zinc-800"
        >
          Dashboard
        </Link>
        <Link
          href="/admin/requests"
          className="block px-4 py-2 rounded hover:bg-zinc-800"
        >
          Orders & Quotes
        </Link>
        <Link
          href="/admin/products"
          className="block px-4 py-2 rounded hover:bg-zinc-800"
        >
          Products
        </Link>
        <Link
          href="/admin/clients"
          className="block px-4 py-2 rounded hover:bg-zinc-800"
        >
          Clients
        </Link>
        <Link
          href="/admin/content"
          className="block px-4 py-2 rounded hover:bg-zinc-800"
        >
          Content
        </Link>
        <Link
          href="/admin/users"
          className="block px-4 py-2 rounded hover:bg-zinc-800"
        >
          Users
        </Link>
      </nav>
    </aside>
  );
}
