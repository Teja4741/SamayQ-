
"use client";

import { useState, type FormEvent } from "react";
import { addDoctor } from "../actions";

type AddDoctorFormProps = {
  clinicId: string;
  onDoctorAdded: () => void;
};

export default function AddDoctorForm({
  clinicId,
  onDoctorAdded,
}: AddDoctorFormProps) {
  const [doctorName, setDoctorName] = useState("");
  const [consultationDuration, setConsultationDuration] = useState("15");
  const [patientsAtOnce, setPatientsAtOnce] = useState("1");
  const [consultationPrice, setConsultationPrice] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!clinicId) {
      setError("Clinic information is missing.");
      return;
    }

    const duration = Number(consultationDuration);
    const patients = Number(patientsAtOnce);
    const price = Number(consultationPrice);

    if (!doctorName.trim()) {
      setError("Please enter the doctor's name.");
      return;
    }

    if (!Number.isInteger(duration) || duration <= 0) {
      setError("Consultation duration must be greater than zero.");
      return;
    }

    if (!Number.isInteger(patients) || patients <= 0) {
      setError("Patients at once must be at least one.");
      return;
    }

    if (
      consultationPrice.trim() === "" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError("Please enter a valid consultation price.");
      return;
    }

    try {
      setLoading(true);

      const result = await addDoctor(clinicId, {
        name: doctorName.trim(),
        consultationDuration: duration,
        patientsAtOnce: patients,
        consultationPrice: price,
      });

      if (!result.success) {
        setError(result.message || "Unable to add doctor.");
        return;
      }

      setSuccess("Doctor added successfully!");

      // Reset form
      setDoctorName("");
      setConsultationDuration("15");
      setPatientsAtOnce("1");
      setConsultationPrice("");

      // Refresh doctor list
      onDoctorAdded();

    } catch (err) {
      console.error("Add doctor form error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Add New Doctor
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter the doctor's consultation details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Doctor Name */}
          <div>
            <label
              htmlFor="doctorName"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Doctor Name
            </label>

            <input
              id="doctorName"
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Enter doctor name"
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Consultation Duration */}
          <div>
            <label
              htmlFor="consultationDuration"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Consultation Duration
            </label>

            <div className="relative">
              <input
                id="consultationDuration"
                type="number"
                min="1"
                step="1"
                value={consultationDuration}
                onChange={(e) => setConsultationDuration(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-16 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />

              <span className="absolute right-3 top-2.5 text-sm text-slate-400">
                minutes
              </span>
            </div>
          </div>

          {/* Patients At Once */}
          <div>
            <label
              htmlFor="patientsAtOnce"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Patients at Once
            </label>

            <input
              id="patientsAtOnce"
              type="number"
              min="1"
              step="1"
              value={patientsAtOnce}
              onChange={(e) => setPatientsAtOnce(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Consultation Price */}
          <div>
            <label
              htmlFor="consultationPrice"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Consultation Price
            </label>

            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-slate-400">
                ₹
              </span>

              <input
                id="consultationPrice"
                type="number"
                min="0"
                step="0.01"
                value={consultationPrice}
                onChange={(e) => setConsultationPrice(e.target.value)}
                placeholder="0.00"
                disabled={loading}
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-7 pr-3 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600 dark:bg-green-950/30 dark:text-green-400">
            {success}
          </p>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Adding Doctor..." : "+ Add Doctor"}
          </button>
        </div>
      </form>
    </div>
  );
}
