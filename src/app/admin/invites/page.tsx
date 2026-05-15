"use client";

import { useState, useEffect } from "react";

interface Invite {
  _id: string;
  email: string;
  usedAt: string | null;
  createdAt: string;
}

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInvites();
  }, []);

  async function fetchInvites() {
    const res = await fetch("/api/invites");
    if (res.ok) {
      setInvites(await res.json());
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setSuccess(`Invite sent to ${email}`);
    setEmail("");
    fetchInvites();
  }

  async function handleRevoke(id: string) {
    const res = await fetch(`/api/invites?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchInvites();
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Manage Invites</h1>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email to invite"
          required
          className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Invite"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm mb-4">
          {success}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Invitations</h2>
      <div className="border rounded-md divide-y">
        {invites.length === 0 && (
          <p className="p-4 text-gray-500 text-sm">No invites yet.</p>
        )}
        {invites.map((invite) => (
          <div key={invite._id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{invite.email}</p>
              <p className="text-xs text-gray-500">
                {invite.usedAt
                  ? `Used on ${new Date(invite.usedAt).toLocaleDateString()}`
                  : `Pending — invited ${new Date(invite.createdAt).toLocaleDateString()}`}
              </p>
            </div>
            {!invite.usedAt && (
              <button
                onClick={() => handleRevoke(invite._id)}
                className="text-sm text-red-600 hover:underline"
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
