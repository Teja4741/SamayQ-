
"use client";

import { useEffect, useState } from "react";

export type EditDepartmentValues = {
  name: string;
  code: string;
  token_letter: string;
  capacity: string;
  description: string;
};

type Props = {
  department: {
    id: string;
    name: string;
    description: string | null;
    ticket_prefix?: string;
    code?: string | null;
    token_letter?: string | null;
    capacity?: number | null;
  } | null;
  onClose: () => void;
  onSave: (values: EditDepartmentValues) => Promise<void>;
};

export default function EditDepartmentDialog({
  department,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [tokenLetter, setTokenLetter] = useState("");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (department) {
      setName(department.name);
      setCode(department.code ?? "");
      setTokenLetter(
        department.token_letter ?? department.ticket_prefix ?? ""
      );
      setCapacity(
        department.capacity != null
          ? String(department.capacity)
          : ""
      );
      setDescription(department.description ?? "");
      setError("");
    }
  }, [department]);

  if (!department) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!name.trim()) {
      setError("Department name is required.");
      return;
    }

    if (tokenLetter.length > 2) {
      setError("Token letter must contain one or two characters.");
      return;
    }

    if (
      capacity.trim() &&
      (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0)
    ) {
      setError("Capacity must be a positive whole number.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSave({
        name: name.trim(),
        code: code.trim(),
        token_letter: tokenLetter.trim().toUpperCase(),
        capacity: capacity.trim(),
        description: description.trim(),
      });

      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update department."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[#dfe3ed] bg-transparent px-4 py-3 text-base text-[#263247] shadow-sm outline-none placeholder:text-[#8794aa] focus:border-[#6557ff] focus:ring-2 focus:ring-[#6557ff]/10";

  const labelClass =
    "mb-1.5 block text-sm font-medium text-[#263247]";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-department-title"
        className="relative w-full max-w-[530px] rounded-2xl border border-[#e0e4ef] bg-[#f7f7fb] p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          aria-label="Close dialog"
          className="absolute right-5 top-4 text-2xl text-slate-500 hover:text-slate-900"
        >
          ×
        </button>

        <h2
          id="edit-department-title"
          className="pr-8 text-[23px] font-semibold tracking-tight text-[#172033]"
        >
          Edit department
        </h2>

        <p className="mt-1.5 text-base leading-6 text-[#64748b]">
          Rename this department or change its code, token letter
          and capacity. Queues, staff and past entries keep their
          link to it.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label htmlFor="department-name" className={labelClass}>
              Department name *
            </label>
            <input
              id="department-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="e.g. Glaucoma"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_105px_105px]">
            <div>
              <label htmlFor="department-code" className={labelClass}>
                Code (optional)
              </label>
              <input
                id="department-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={30}
                placeholder="e.g. CARD, SEC-A"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="token-letter" className={labelClass}>
                Token letter
              </label>
              <input
                id="token-letter"
                value={tokenLetter}
                onChange={(e) =>
                  setTokenLetter(
                    e.target.value
                      .replace(/[^a-zA-Z]/g, "")
                      .slice(0, 2)
                      .toUpperCase()
                  )
                }
                maxLength={2}
                placeholder="G"
                className={`${inputClass} text-center`}
              />
            </div>

            <div>
              <label htmlFor="department-capacity" className={labelClass}>
                Capacity (optional)
              </label>
              <input
                id="department-capacity"
                type="number"
                min="1"
                step="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g. 24"
                className={inputClass}
              />
            </div>
          </div>

          <p className="pt-1 text-sm leading-6 text-[#718096]">
            The token letter (one or two characters) goes in front
            of every token this department hands out, like{" "}
            <strong className="text-[#263247]">#G1, #G2</strong>{" "}
            on display screens, slips, messages and announcements.
            Leave it empty for plain numbers.
          </p>

          <div>
            <label htmlFor="department-description" className={labelClass}>
              Description (optional)
            </label>
            <textarea
              id="department-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Department description"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[#dfe3ed] px-5 py-2.5 text-sm font-medium text-[#263247] hover:bg-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#6557ff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5145e5] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
