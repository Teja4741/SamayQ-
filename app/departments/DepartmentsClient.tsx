
"use client";

import { useState } from "react";
import EditDepartmentDialog, {
  type EditDepartmentValues,
} from "./EditDepartmentDialog";

export type Department = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at?: string;
  ticket_prefix?: string;
  own_line?: boolean;
  code?: string | null;
  token_letter?: string | null;
  capacity?: number | null;
};

type Props = {
  clinicName: string;
  clinicLocation?: string;
  departments: Department[];

  onAdd: (data: {
    name: string;
    description: string;
    ticket_prefix: string;
  }) => Promise<void>;

  onEdit: (
    id: string,
    data: {
      name: string;
      description: string;
      ticket_prefix: string;
    }
  ) => Promise<void>;

  onDelete: (id: string) => Promise<void>;
  onReactivate: (id: string) => Promise<void>;
  onToggleOwnLine: (id: string, enabled: boolean) => Promise<void>;
  onLineModeChange: (mode: "shared" | "each") => Promise<void>;
};

export default function DepartmentsClient({
  clinicName,
  clinicLocation,
  departments,
  onAdd,
  onEdit,
  onDelete,
  onReactivate,
  onToggleOwnLine,
  onLineModeChange,
}: Props) {
  const [lineMode, setLineMode] = useState<"shared" | "each">("each");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prefix, setPrefix] = useState("");

  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const activeDepartments = departments.filter((d) => d.is_active);
  const inactiveDepartments = departments.filter((d) => !d.is_active);

  function openAdd() {
    setName("");
    setDescription("");
    setPrefix("");
    setShowForm(true);
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);

    try {
      await onAdd({
        name: name.trim(),
        description: description.trim(),
        ticket_prefix: prefix.trim().toUpperCase(),
      });

      setShowForm(false);
      setName("");
      setDescription("");
      setPrefix("");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSave(values: EditDepartmentValues) {
    if (!editing) return;

    await onEdit(editing.id, {
      name: values.name,
      description: values.description,
      ticket_prefix: values.token_letter,
    });

    setEditing(null);
  }

  async function changeLineMode(mode: "shared" | "each") {
    setLineMode(mode);
    await onLineModeChange(mode);
  }

  return (
    <main className="min-h-screen bg-[#f3f5fc] px-4 py-6 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-[1450px]">

        {/* Header */}
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Settings
            </h1>

            <p className="mt-1 text-xl">
              Manage settings for <strong>{clinicName}</strong>
              {clinicLocation ? ` (${clinicLocation})` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2 text-sm text-slate-600">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="hover:text-indigo-600"
            >
              Expand all
            </button>

            <span>•</span>

            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="hover:text-indigo-600"
            >
              Collapse all
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-9 flex gap-8 border-b border-slate-200">
          <button
            type="button"
            className="border-b-2 border-transparent px-3 pb-4 text-base text-slate-500"
          >
            Branch Settings
          </button>

          <button
            type="button"
            className="border-b-2 border-indigo-500 px-3 pb-4 text-base font-medium text-slate-950"
          >
            Departments Settings
          </button>
        </div>

        {/* Department Card */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl text-indigo-500">▱</span>
                <h2 className="text-2xl font-semibold">Departments</h2>
              </div>

              <p className="mt-1 text-base text-slate-500">
                Group queues, staff and service points within this location.
              </p>
            </div>

            <button
              type="button"
              onClick={openAdd}
              className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
            >
              + Add department
            </button>
          </div>

          {/* How departments run */}
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="mb-3 text-sm font-semibold">
              How departments run
            </h3>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void changeLineMode("shared")}
                className={`min-w-[290px] rounded-xl border px-4 py-3 text-left transition ${
                  lineMode === "shared"
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-indigo-300"
                }`}
              >
                <span className="block font-semibold">One shared line</span>
                <span className="mt-1 block text-sm text-slate-500">
                  One ticket sequence for the whole location
                </span>
              </button>

              <button
                type="button"
                onClick={() => void changeLineMode("each")}
                className={`min-w-[290px] rounded-xl border px-4 py-3 text-left transition ${
                  lineMode === "each"
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-indigo-300"
                }`}
              >
                <span className="block font-semibold">A line each</span>
                <span className="mt-1 block text-sm text-slate-500">
                  Own tickets from #1, own board and screen
                </span>
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Customers still transfer between departments. They are given a
              new ticket number in the line they move to, and told what it is.
            </p>
          </div>

          {/* Active Departments */}
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            {activeDepartments.map((department) => (
              <div
                key={department.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-5">
                  <span className="cursor-grab text-xl text-slate-400">
                    ⠿
                  </span>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold">
                        {department.name}
                      </h3>

                      {department.ticket_prefix && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                          #{department.ticket_prefix}
                        </span>
                      )}
                    </div>

                    {department.description && (
                      <p className="mt-1 text-sm text-slate-500">
                        {department.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void onToggleOwnLine(
                        department.id,
                        !(department.own_line ?? lineMode === "each")
                      )
                    }
                    className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                      (department.own_line ?? lineMode === "each")
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    ☷ Own line
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditing(department)}
                    title="Edit department"
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                  >
                    ✎
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete ${department.name}? This cannot be undone.`
                        )
                      ) {
                        void onDelete(department.id);
                      }
                    }}
                    title="Delete department"
                    className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  >
                    ♧
                  </button>
                </div>
              </div>
            ))}

            {activeDepartments.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No active departments. Add your first department to get started.
              </div>
            )}

            {/* Inactive Departments */}
            {inactiveDepartments.map((department) => (
              <div
                key={department.id}
                className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/50 px-5 py-5"
              >
                <div className="flex items-center gap-5">
                  <span className="text-xl text-slate-400">⠿</span>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold text-slate-500">
                        {department.name}
                      </h3>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                        Inactive
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void onReactivate(department.id)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    ↶ Reactivate
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Permanently delete ${department.name}?`
                        )
                      ) {
                        void onDelete(department.id);
                      }
                    }}
                    title="Delete department"
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                  >
                    ♧
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Add Department Modal */}
        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !saving) {
                setShowForm(false);
              }
            }}
          >
            <form
              onSubmit={handleAdd}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Add department
                </h2>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xl text-slate-500 hover:text-slate-900"
                >
                  ×
                </button>
              </div>

              <label className="mb-2 block text-sm font-medium">
                Department name
              </label>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. OPD"
                required
                className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />

              <label className="mb-2 block text-sm font-medium">
                Ticket prefix
              </label>

              <input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="e.g. G"
                maxLength={2}
                className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-3 uppercase outline-none focus:border-indigo-500"
              />

              <label className="mb-2 block text-sm font-medium">
                Description
              </label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional department description"
                rows={3}
                className="mb-6 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-300 px-5 py-2.5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add department"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Separate Edit Department Dialog */}
        {editing && (
          <EditDepartmentDialog
            key={editing.id}
            department={editing}
            onClose={() => setEditing(null)}
            onSave={handleEditSave}
          />
        )}
      </div>
    </main>
  );
}
