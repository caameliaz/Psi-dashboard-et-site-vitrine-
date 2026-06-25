export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border border-zinc-200">
          <p className="text-zinc-600 text-sm mb-2">Total Orders</p>
          <p className="text-3xl font-bold text-zinc-900">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-zinc-200">
          <p className="text-zinc-600 text-sm mb-2">Pending Orders</p>
          <p className="text-3xl font-bold text-zinc-900">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-zinc-200">
          <p className="text-zinc-600 text-sm mb-2">Total Quotes</p>
          <p className="text-3xl font-bold text-zinc-900">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-zinc-200">
          <p className="text-zinc-600 text-sm mb-2">Recent Contacts</p>
          <p className="text-3xl font-bold text-zinc-900">0</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-zinc-200">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Recent Requests</h2>
        <p className="text-zinc-600">No recent requests</p>
      </div>
    </div>
  );
}
