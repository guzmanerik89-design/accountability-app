"use client";
import { useState } from "react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ENTITY_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Client {
  id: number;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  entityType: string | null;
  einLast4: string | null;
  deadline: string | null;
  notes: string | null;
  missingItems: string | null;
  tasks: { status: string }[];
}

const emptyForm = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  entityType: "",
  einLast4: "",
  deadline: "",
  notes: "",
  missingItems: "",
};

export function ClientsManager({ clients: initial }: { clients: Client[] }) {
  const [clients, setClients] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditClient(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditClient(c);
    setForm({
      name: c.name,
      contactName: c.contactName || "",
      phone: c.phone || "",
      email: c.email || "",
      entityType: c.entityType || "",
      einLast4: c.einLast4 || "",
      deadline: c.deadline || "",
      notes: c.notes || "",
      missingItems: c.missingItems || "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Business name required"); return; }
    setSaving(true);
    try {
      if (editClient) {
        const res = await fetch(`/api/clients/${editClient.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const updated = await res.json();
        setClients((prev) =>
          prev.map((c) => (c.id === editClient.id ? { ...c, ...updated } : c))
        );
        toast.success("Client updated");
      } else {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const newClient = await res.json();
        setClients((prev) => [...prev, { ...newClient, tasks: [] }]);
        toast.success("Client added — tasks auto-created");
      }
      setOpen(false);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this client and all their tasks?")) return;
    try {
      await fetch(`/api/clients/${id}`, { method: "DELETE" });
      setClients((prev) => prev.filter((c) => c.id !== id));
      toast.success("Client deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700">
          + Add Client
        </Button>
      </div>

      <div className="grid gap-4">
        {clients.map((c, i) => {
          const done = c.tasks.filter((t) => t.status === "complete").length;
          const pct = c.tasks.length > 0 ? Math.round((done / c.tasks.length) * 100) : 0;
          const days = c.deadline
            ? differenceInDays(new Date(c.deadline), new Date())
            : null;

          return (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{c.name}</h3>
                    {c.entityType && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {c.entityType}
                      </span>
                    )}
                    {days !== null && (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          days < 0
                            ? "bg-red-100 text-red-700"
                            : days <= 7
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-slate-500">
                    {c.contactName && <span>👤 {c.contactName}</span>}
                    {c.phone && <span>📞 {c.phone}</span>}
                    {c.email && <span>✉️ {c.email}</span>}
                    {c.einLast4 && <span>EIN: ••••{c.einLast4}</span>}
                    {c.deadline && (
                      <span>📅 {format(new Date(c.deadline), "MM/dd/yyyy")}</span>
                    )}
                  </div>
                  {c.missingItems && (
                    <div className="mt-2 text-xs bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-yellow-800">
                      ⚠️ Missing: {c.missingItems}
                    </div>
                  )}
                  {c.notes && (
                    <div className="mt-2 text-xs text-slate-500">{c.notes}</div>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 max-w-[200px] h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">
                      {done}/{c.tasks.length} tasks · {pct}%
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(c)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {clients.length === 0 && (
        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
          No clients yet. Click &quot;Add Client&quot; to get started.
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editClient ? "Edit Client" : "Add New Client"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Business Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Atom Solutions"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Name</Label>
                <Input
                  value={form.contactName}
                  onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Entity Type</Label>
                <Select
                  value={form.entityType}
                  onValueChange={(v) => setForm((p) => ({ ...p, entityType: v as string }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(555) 000-0000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="contact@business.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>EIN Last 4</Label>
                <Input
                  value={form.einLast4}
                  onChange={(e) => setForm((p) => ({ ...p, einLast4: e.target.value }))}
                  placeholder="1234"
                  maxLength={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Missing Items</Label>
                <Input
                  value={form.missingItems}
                  onChange={(e) => setForm((p) => ({ ...p, missingItems: e.target.value }))}
                  placeholder="Bank statements, W-9s..."
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Special notes about this client..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? "Saving..." : editClient ? "Update" : "Add Client"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
