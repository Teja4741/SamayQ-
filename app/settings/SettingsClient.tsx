
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveClinicFeatureFlags } from "@/app/settings/actions";
import {
  saveRegistrationCapacityRule,
  deleteRegistrationCapacityRule,
} from "./capacity-actions";

import PublicAppointmentBooking from "@/app/settings/components/PublicAppointmentBooking";
type Clinic = {
  id: string;
  name: string;
  public_booking_code: string | null;
  public_booking_enabled: boolean;
};

type Department = {
  id: string;
  name: string;
  is_active: boolean;
};

type BookingMode = "doctor" | "department" | "custom";
type QueueMode = "shared" | "separate";
type CapacityScope = "clinic" | "doctor" | "department" | "section";

type ClinicSettings = {
  clinic_id: string;
  booking_mode: BookingMode;
  doctor_booking_enabled: boolean;
  department_booking_enabled: boolean;
  queue_mode: QueueMode;
};

export type RegistrationCapacityRule = {
  id: string;
  clinic_id: string;
  scope_type: CapacityScope;
  doctor_clinic_assignment_id: string | null;
  department_id: string | null;
  section_id: string | null;
  appointment_daily_limit_enabled: boolean;
  appointment_daily_limit: number | null;
  appointment_slot_limit_enabled: boolean;
  appointment_slot_limit: number | null;
  walkin_daily_limit_enabled: boolean;
  walkin_daily_limit: number | null;
};

type Props = {
  clinics: Clinic[];
  selectedClinicId: string | null;
  selectedClinicName: string | null;
  departments: Department[];
  isPlatformAdmin: boolean;
  initialSettings: ClinicSettings | null;
  initialCapacityRules: RegistrationCapacityRule[];
  initialPublicBookingCode: string | null;
  initialPublicBookingEnabled: boolean;
};

type CapacityDraft = {
  id: string | null;
  scope_type: CapacityScope;
  department_id: string;
  appointment_daily_limit_enabled: boolean;
  appointment_daily_limit: string;
  appointment_slot_limit_enabled: boolean;
  appointment_slot_limit: string;
  walkin_daily_limit_enabled: boolean;
  walkin_daily_limit: string;
};

const sections = [
  { id: "queue", label: "Queue", icon: "☷" },
  { id: "registration-capacity", label: "Registration Capacity", icon: "⚖" },
  { id: "display-board", label: "Display board", icon: "▣" },
  { id: "rooms", label: "Rooms", icon: "♧" },
  { id: "notifications", label: "Notifications", icon: "♧" },
  { id: "location", label: "Location", icon: "⌖" },
  { id: "feedback-survey", label: "Feedback Survey", icon: "▱" },
  { id: "danger", label: "Danger", icon: "⚠" },
];

const defaultSettings = {
  bookingMode: "doctor" as BookingMode,
  doctorBookingEnabled: true,
  departmentBookingEnabled: false,
  queueMode: "separate" as QueueMode,
};

const emptyDraft = (): CapacityDraft => ({
  id: null,
  scope_type: "clinic",
  department_id: "",
  appointment_daily_limit_enabled: false,
  appointment_daily_limit: "",
  appointment_slot_limit_enabled: false,
  appointment_slot_limit: "",
  walkin_daily_limit_enabled: false,
  walkin_daily_limit: "",
});

const inputClass =
  "mt-2 w-full rounded-lg border border-[#dfe3ed] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#6557ff] focus:ring-1 focus:ring-[#6557ff]";

const checkboxClass = "h-4 w-4 accent-[#6557ff]";

export default function SettingsClient({
  clinics,
  selectedClinicId,
  selectedClinicName,
  departments,
  initialSettings,
  initialCapacityRules,
  initialPublicBookingCode,
  initialPublicBookingEnabled,
}: Props) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"branch" | "departments">(
    "branch"
  );

  const [expandedSections, setExpandedSections] = useState<string[]>(
    sections.map((section) => section.id)
  );

  const [bookingMode, setBookingMode] = useState<BookingMode>(
    initialSettings?.booking_mode ?? defaultSettings.bookingMode
  );

  const [doctorBookingEnabled, setDoctorBookingEnabled] = useState(
    initialSettings?.doctor_booking_enabled ??
      defaultSettings.doctorBookingEnabled
  );

  const [departmentBookingEnabled, setDepartmentBookingEnabled] = useState(
    initialSettings?.department_booking_enabled ??
      defaultSettings.departmentBookingEnabled
  );

  const [queueMode, setQueueMode] = useState<QueueMode>(
    initialSettings?.queue_mode ?? defaultSettings.queueMode
  );

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);

  const [capacityRules, setCapacityRules] =
    useState<RegistrationCapacityRule[]>(initialCapacityRules ?? []);

  const [capacityDraft, setCapacityDraft] =
    useState<CapacityDraft>(emptyDraft());

  const [editingCapacity, setEditingCapacity] = useState(false);
  const [capacitySaving, setCapacitySaving] = useState(false);
  const [capacityMessage, setCapacityMessage] = useState("");
  const [capacitySuccess, setCapacitySuccess] = useState<boolean | null>(
    null
  );
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  useEffect(() => {
    setBookingMode(
      initialSettings?.booking_mode ?? defaultSettings.bookingMode
    );

    setDoctorBookingEnabled(
      initialSettings?.doctor_booking_enabled ??
        defaultSettings.doctorBookingEnabled
    );

    setDepartmentBookingEnabled(
      initialSettings?.department_booking_enabled ??
        defaultSettings.departmentBookingEnabled
    );

    setQueueMode(initialSettings?.queue_mode ?? defaultSettings.queueMode);

    setSaveMessage("");
    setSaveSuccess(null);
  }, [selectedClinicId, initialSettings]);

  useEffect(() => {
    setCapacityRules(initialCapacityRules ?? []);
    setCapacityDraft(emptyDraft());
    setEditingCapacity(false);
    setCapacityMessage("");
    setCapacitySuccess(null);
  }, [selectedClinicId, initialCapacityRules]);

  function toggleSection(id: string) {
    setExpandedSections((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function expandAll() {
    setExpandedSections(sections.map((section) => section.id));
  }

  function collapseAll() {
    setExpandedSections([]);
  }

  function selectClinic(clinicId: string) {
    router.push(`/settings?clinicId=${encodeURIComponent(clinicId)}`);
  }

  function handleBookingModeChange(mode: BookingMode) {
    setBookingMode(mode);

    if (mode === "doctor") {
      setDoctorBookingEnabled(true);
      setDepartmentBookingEnabled(false);
    } else if (mode === "department") {
      setDoctorBookingEnabled(false);
      setDepartmentBookingEnabled(true);
    } else {
      // Custom allows exactly one operating model.
      setDoctorBookingEnabled(true);
      setDepartmentBookingEnabled(false);
    }

    setSaveMessage("");
    setSaveSuccess(null);
  }

  function handleCustomModelChange(model: "doctor" | "department") {
    setDoctorBookingEnabled(model === "doctor");
    setDepartmentBookingEnabled(model === "department");
    setSaveMessage("");
    setSaveSuccess(null);
  }

  async function handleSaveSettings() {
    if (!selectedClinicId) return;

    if (
      bookingMode === "custom" &&
      doctorBookingEnabled === departmentBookingEnabled
    ) {
      setSaveMessage("Select exactly one booking model in Custom mode.");
      setSaveSuccess(false);
      return;
    }

    setSaving(true);
    setSaveMessage("");
    setSaveSuccess(null);

    try {
      const result = await saveClinicFeatureFlags({
        clinicId: selectedClinicId,
        bookingMode,
        doctorBookingEnabled,
        departmentBookingEnabled,
        queueMode,
      });

      setSaveMessage(result.message);
      setSaveSuccess(result.success);
    } catch {
      setSaveMessage("Unable to save clinic settings.");
      setSaveSuccess(false);
    } finally {
      setSaving(false);
    }
  }

  function getRuleLabel(rule: RegistrationCapacityRule) {
    if (rule.scope_type === "clinic") return "Entire clinic";

    if (rule.scope_type === "doctor") return "Doctor";

    if (rule.scope_type === "department") {
      const department = departments.find(
        (item) => item.id === rule.department_id
      );
      return department?.name ?? "Department";
    }

    if (rule.scope_type === "section") return "Department section";

    return "Capacity rule";
  }

  function editCapacityRule(rule: RegistrationCapacityRule) {
    setCapacityDraft({
      id: rule.id,
      scope_type: rule.scope_type,
      department_id: rule.department_id ?? "",
      appointment_daily_limit_enabled:
        rule.appointment_daily_limit_enabled,
      appointment_daily_limit:
        rule.appointment_daily_limit?.toString() ?? "",
      appointment_slot_limit_enabled:
        rule.appointment_slot_limit_enabled,
      appointment_slot_limit:
        rule.appointment_slot_limit?.toString() ?? "",
      walkin_daily_limit_enabled: rule.walkin_daily_limit_enabled,
      walkin_daily_limit: rule.walkin_daily_limit?.toString() ?? "",
    });

    setEditingCapacity(true);
    setCapacityMessage("");
    setCapacitySuccess(null);
  }

  function cancelCapacityEdit() {
    setCapacityDraft(emptyDraft());
    setEditingCapacity(false);
    setCapacityMessage("");
    setCapacitySuccess(null);
  }

  function updateCapacityDraft<K extends keyof CapacityDraft>(
    key: K,
    value: CapacityDraft[K]
  ) {
    setCapacityDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validateCapacityDraft(): string | null {
    if (!selectedClinicId) return "Select a clinic first.";

    if (
      capacityDraft.scope_type === "department" &&
      !capacityDraft.department_id
    ) {
      return "Please select a department.";
    }

    if (
      capacityDraft.scope_type === "doctor" ||
      capacityDraft.scope_type === "section"
    ) {
      return "Doctor and section configuration will be available after those records are created.";
    }

    const values = [
      {
        enabled: capacityDraft.appointment_daily_limit_enabled,
        value: capacityDraft.appointment_daily_limit,
        label: "Appointment daily limit",
      },
      {
        enabled: capacityDraft.appointment_slot_limit_enabled,
        value: capacityDraft.appointment_slot_limit,
        label: "Appointment slot limit",
      },
      {
        enabled: capacityDraft.walkin_daily_limit_enabled,
        value: capacityDraft.walkin_daily_limit,
        label: "Walk-in daily limit",
      },
    ];

    for (const item of values) {
      if (!item.enabled) continue;

      const number = Number(item.value);

      if (
        !item.value.trim() ||
        !Number.isInteger(number) ||
        number <= 0
      ) {
        return `${item.label} must be a positive whole number.`;
      }
    }

    if (
      !capacityDraft.appointment_daily_limit_enabled &&
      !capacityDraft.appointment_slot_limit_enabled &&
      !capacityDraft.walkin_daily_limit_enabled
    ) {
      return "Enable at least one capacity limit.";
    }

    return null;
  }

  async function handleSaveCapacityRule() {
    if (!selectedClinicId) return;

    const validationMessage = validateCapacityDraft();

    if (validationMessage) {
      setCapacityMessage(validationMessage);
      setCapacitySuccess(false);
      return;
    }

    setCapacitySaving(true);
    setCapacityMessage("");
    setCapacitySuccess(null);

    try {
      const result = await saveRegistrationCapacityRule({
        id: capacityDraft.id,
        clinicId: selectedClinicId,
        scopeType: capacityDraft.scope_type,
        departmentId:
          capacityDraft.scope_type === "department"
            ? capacityDraft.department_id
            : null,
        appointmentDailyLimitEnabled:
          capacityDraft.appointment_daily_limit_enabled,
        appointmentDailyLimit:
          capacityDraft.appointment_daily_limit_enabled
            ? Number(capacityDraft.appointment_daily_limit)
            : null,
        appointmentSlotLimitEnabled:
          capacityDraft.appointment_slot_limit_enabled,
        appointmentSlotLimit:
          capacityDraft.appointment_slot_limit_enabled
            ? Number(capacityDraft.appointment_slot_limit)
            : null,
        walkinDailyLimitEnabled:
          capacityDraft.walkin_daily_limit_enabled,
        walkinDailyLimit:
          capacityDraft.walkin_daily_limit_enabled
            ? Number(capacityDraft.walkin_daily_limit)
            : null,
      });

      if (!result.success) {
        setCapacityMessage(result.message);
        setCapacitySuccess(false);
        return;
      }

      setCapacityMessage(result.message);
      setCapacitySuccess(true);

      router.refresh();
      setEditingCapacity(false);
      setCapacityDraft(emptyDraft());
    } catch {
      setCapacityMessage("Unable to save capacity settings.");
      setCapacitySuccess(false);
    } finally {
      setCapacitySaving(false);
    }
  }

  async function handleDeleteCapacityRule(ruleId: string) {
    if (!selectedClinicId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this capacity rule?"
    );

    if (!confirmed) return;

    setDeletingRuleId(ruleId);
    setCapacityMessage("");
    setCapacitySuccess(null);

    try {
      const result = await deleteRegistrationCapacityRule({
        ruleId,
        clinicId: selectedClinicId,
      });

      if (!result.success) {
        setCapacityMessage(result.message);
        setCapacitySuccess(false);
        return;
      }

      setCapacityRules((current) =>
        current.filter((rule) => rule.id !== ruleId)
      );

      setCapacityMessage(result.message);
      setCapacitySuccess(true);

      if (capacityDraft.id === ruleId) {
        cancelCapacityEdit();
      }

      router.refresh();
    } catch {
      setCapacityMessage("Unable to delete capacity rule.");
      setCapacitySuccess(false);
    } finally {
      setDeletingRuleId(null);
    }
  }

  function renderLimitInput(
    title: string,
    description: string,
    enabled: boolean,
    value: string,
    onToggle: (checked: boolean) => void,
    onValueChange: (value: string) => void
  ) {
    return (
      <div className="rounded-xl border border-[#e0e4ef] p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onToggle(event.target.checked)}
            className={`${checkboxClass} mt-1`}
          />

          <span className="flex-1">
            <span className="block font-medium">{title}</span>
            <span className="mt-1 block text-sm text-[#68758d]">
              {description}
            </span>
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              enabled
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {enabled ? "Enabled" : "Unlimited"}
          </span>
        </label>

        {enabled && (
          <div className="mt-4">
            <label className="text-sm font-medium">
              Maximum registrations
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              placeholder="Enter a positive number"
              className={inputClass}
            />
          </div>
        )}
      </div>
    );
  }

  if (!selectedClinicId) {
    return (
      <main className="min-h-screen bg-[#f8f9ff] text-[#171a2b]">
        <div className="mx-auto max-w-[1600px] px-5 pb-12 pt-8 md:px-10">
          <section className="rounded-xl border border-[#e0e4ef] bg-white p-6">
            <p className="mb-2 text-sm text-[#65718a]">
              Dashboard / Settings
            </p>

            <h1 className="text-2xl font-semibold">Settings</h1>

            <p className="mt-2 text-sm text-[#65718a]">
              Select a clinic to manage its settings.
            </p>

            {clinics.length === 0 ? (
              <p className="mt-5 text-sm text-[#65718a]">
                No active clinics are available to your account.
              </p>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clinics.map((clinic) => (
                  <button
                    key={clinic.id}
                    type="button"
                    onClick={() => selectClinic(clinic.id)}
                    className="rounded-lg border border-[#e0e4ef] p-4 text-left transition hover:border-[#bdb6ff] hover:bg-[#fafaff]"
                  >
                    <span className="font-medium">{clinic.name}</span>
                    <span className="mt-1 block text-sm text-[#65718a]">
                      Manage settings →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f9ff] text-[#171a2b]">
      <div className="mx-auto max-w-[1600px] px-5 pb-12 pt-8 md:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm text-[#65718a]">
              Dashboard / Settings
            </p>

            <h1 className="text-[30px] font-semibold leading-tight">
              Settings
            </h1>

            <p className="mt-1 text-lg">
              Manage settings for <strong>{selectedClinicName}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2 text-sm text-[#536c91]">
            <button type="button" onClick={expandAll} className="hover:text-[#5145f5]">
              Expand all
            </button>

            <span>•</span>

            <button type="button" onClick={collapseAll} className="hover:text-[#5145f5]">
              Collapse all
            </button>
          </div>
        </div>

        {/* Settings tabs */}
        <div className="mt-8 flex gap-1 border-b border-[#e1e5ef]">
          <button
            type="button"
            onClick={() => setActiveTab("branch")}
            className={`border-b-2 px-4 py-4 text-sm font-medium ${
              activeTab === "branch"
                ? "border-[#6557ff] text-[#17203a]"
                : "border-transparent text-[#65718a] hover:text-[#5145f5]"
            }`}
          >
            Branch Settings
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("departments")}
            className={`border-b-2 px-4 py-4 text-sm font-medium ${
              activeTab === "departments"
                ? "border-[#6557ff] text-[#17203a]"
                : "border-transparent text-[#65718a] hover:text-[#5145f5]"
            }`}
          >
            Departments Settings
          </button>
        </div>

        {activeTab === "branch" ? (
          <>
            {/* Jump to sections */}
            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              <span className="mr-1 text-xs font-semibold tracking-wider text-[#65718a]">
                JUMP TO
              </span>

              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`inline-flex items-center gap-2 rounded-full border border-[#e0e4ef] bg-[#f4f6fc] px-4 py-2.5 text-sm text-[#526581] transition hover:border-[#bdb6ff] hover:bg-white ${
                    section.id === "danger" ? "text-red-600" : ""
                  }`}
                >
                  <span>{section.icon}</span>
                  {section.label}
                </a>
              ))}
            </div>

            <div className="mt-8 space-y-4">
              {sections.map((section) => {
                const isExpanded = expandedSections.includes(section.id);

                return (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-5 overflow-hidden rounded-xl border border-[#e0e4ef] bg-white"
                  >
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => toggleSection(section.id)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold hover:bg-[#fafaff]"
                    >
                      {section.label}
                      <span className="text-xl text-[#66738b]">
                        {isExpanded ? "−" : "+"}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-[#edf0f6] px-5 py-5">
                        {section.id === "queue" ? (
                          <div className="space-y-7">
                            {/* Booking mode */}
                            <div>
                              <h2 className="text-lg font-semibold">
                                Booking Configuration
                              </h2>

                              <p className="mt-1 text-sm text-[#68758d]">
                                Choose how patients can book appointments at
                                this clinic.
                              </p>

                              <div className="mt-5 grid gap-4 md:grid-cols-3">
                                {(
                                  [
                                    {
                                      mode: "doctor",
                                      icon: "🩺",
                                      title: "Doctor-wise",
                                      description:
                                        "Patients select a doctor directly while booking.",
                                    },
                                    {
                                      mode: "department",
                                      icon: "🏥",
                                      title: "Department-wise",
                                      description:
                                        "Patients select a department and section, not a doctor.",
                                    },
                                    {
                                      mode: "custom",
                                      icon: "⚙️",
                                      title: "Custom",
                                      description:
                                        "Choose one operating model for this clinic.",
                                    },
                                  ] as const
                                ).map((item) => (
                                  <button
                                    key={item.mode}
                                    type="button"
                                    onClick={() =>
                                      handleBookingModeChange(item.mode)
                                    }
                                    className={`rounded-xl border p-5 text-left transition ${
                                      bookingMode === item.mode
                                        ? "border-[#6557ff] bg-[#f5f3ff] ring-1 ring-[#6557ff]"
                                        : "border-[#e0e4ef] hover:border-[#bdb6ff]"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-2xl">
                                        {item.icon}
                                      </span>
                                      <span
                                        className={`h-4 w-4 rounded-full border-2 ${
                                          bookingMode === item.mode
                                            ? "border-[#6557ff] bg-[#6557ff]"
                                            : "border-gray-300"
                                        }`}
                                      />
                                    </div>

                                    <h3 className="mt-4 font-semibold">
                                      {item.title}
                                    </h3>

                                    <p className="mt-2 text-sm text-[#68758d]">
                                      {item.description}
                                    </p>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {bookingMode === "custom" && (
                              <div className="rounded-xl border border-[#e0e4ef] bg-[#fafaff] p-5">
                                <h3 className="font-semibold">
                                  Custom Booking Model
                                </h3>

                                <p className="mt-1 text-sm text-[#68758d]">
                                  Select exactly one operating model. Doctor
                                  and department booking cannot run together.
                                </p>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#e0e4ef] bg-white p-4">
                                    <input
                                      type="radio"
                                      name="custom-booking-model"
                                      checked={doctorBookingEnabled}
                                      onChange={() =>
                                        handleCustomModelChange("doctor")
                                      }
                                      className={checkboxClass}
                                    />
                                    <span>
                                      <span className="block font-medium">
                                        Doctor-wise
                                      </span>
                                      <span className="text-sm text-[#68758d]">
                                        Patients select a doctor.
                                      </span>
                                    </span>
                                  </label>

                                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#e0e4ef] bg-white p-4">
                                    <input
                                      type="radio"
                                      name="custom-booking-model"
                                      checked={departmentBookingEnabled}
                                      onChange={() =>
                                        handleCustomModelChange("department")
                                      }
                                      className={checkboxClass}
                                    />
                                    <span>
                                      <span className="block font-medium">
                                        Department-wise
                                      </span>
                                      <span className="text-sm text-[#68758d]">
                                        Patients select a department.
                                      </span>
                                    </span>
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Queue mode */}
                            <div className="border-t border-[#edf0f6] pt-6">
                              <h3 className="text-lg font-semibold">
                                Queue Management
                              </h3>

                              <p className="mt-1 text-sm text-[#68758d]">
                                Choose the physical queue arrangement for this
                                clinic. This setting is separate from
                                appointment and walk-in numbering.
                              </p>

                              <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <button
                                  type="button"
                                  onClick={() => setQueueMode("shared")}
                                  className={`rounded-xl border p-5 text-left transition ${
                                    queueMode === "shared"
                                      ? "border-[#6557ff] bg-[#f5f3ff] ring-1 ring-[#6557ff]"
                                      : "border-[#e0e4ef] hover:border-[#bdb6ff]"
                                  }`}
                                >
                                  <h4 className="font-semibold">
                                    Shared Queue
                                  </h4>
                                  <p className="mt-2 text-sm text-[#68758d]">
                                    Manage patients through a common physical
                                    waiting line.
                                  </p>
                                  <span className="mt-3 inline-block text-xs font-medium text-[#6557ff]">
                                    {queueMode === "shared"
                                      ? "Selected"
                                      : "Select this option"}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setQueueMode("separate")}
                                  className={`rounded-xl border p-5 text-left transition ${
                                    queueMode === "separate"
                                      ? "border-[#6557ff] bg-[#f5f3ff] ring-1 ring-[#6557ff]"
                                      : "border-[#e0e4ef] hover:border-[#bdb6ff]"
                                  }`}
                                >
                                  <h4 className="font-semibold">
                                    Separate Queues
                                  </h4>
                                  <p className="mt-2 text-sm text-[#68758d]">
                                    Maintain independent physical waiting
                                    lines.
                                  </p>
                                  <span className="mt-3 inline-block text-xs font-medium text-[#6557ff]">
                                    {queueMode === "separate"
                                      ? "Selected"
                                      : "Select this option"}
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* Public Appointment Booking */}
                            {selectedClinicId && (
                              <PublicAppointmentBooking
                                clinicId={selectedClinicId}
                                clinicName={selectedClinicName ?? "Clinic"}
                                initialCode={initialPublicBookingCode}
                                initialEnabled={initialPublicBookingEnabled}
                              />
                            )}

                            {/* Save settings */}
                            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#edf0f6] pt-5">
                              <div>
                                {saveMessage && (
                                  <p
                                    className={`text-sm ${
                                      saveSuccess
                                        ? "text-emerald-700"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {saveMessage}
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={handleSaveSettings}
                                disabled={saving}
                                className="rounded-lg bg-[#6557ff] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#5145e5] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {saving ? "Saving..." : "Save Configuration"}
                              </button>
                            </div>
                          </div>
                        ) : section.id === "registration-capacity" ? (
                          <div className="space-y-6">
                            <div>
                              <h2 className="text-lg font-semibold">
                                Patient Registration Capacity
                              </h2>
                              <p className="mt-1 text-sm text-[#68758d]">
                                Set optional limits for appointments and
                                walk-in registrations. All limits are
                                unlimited by default.
                              </p>
                            </div>

                            {/* Existing rules */}
                            <div>
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <h3 className="font-semibold">
                                  Configured Capacity Rules
                                </h3>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setCapacityDraft(emptyDraft());
                                    setEditingCapacity(true);
                                    setCapacityMessage("");
                                    setCapacitySuccess(null);
                                  }}
                                  className="rounded-lg bg-[#6557ff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5145e5]"
                                >
                                  + Add Capacity Rule
                                </button>
                              </div>

                              {capacityRules.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-[#d8ddec] bg-[#fafbff] p-6 text-center">
                                  <p className="font-medium">
                                    No capacity rules configured
                                  </p>
                                  <p className="mt-1 text-sm text-[#68758d]">
                                    Registrations are unlimited until you
                                    enable a capacity limit.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {capacityRules.map((rule) => (
                                    <div
                                      key={rule.id}
                                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#e0e4ef] p-4"
                                    >
                                      <div>
                                        <p className="font-medium">
                                          {getRuleLabel(rule)}
                                        </p>
                                        <p className="mt-1 text-xs text-[#68758d]">
                                          {rule.scope_type} capacity
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                          <span className="rounded-full bg-[#f0f2fb] px-2.5 py-1">
                                            Appointment daily:{" "}
                                            {rule.appointment_daily_limit_enabled
                                              ? rule.appointment_daily_limit
                                              : "Unlimited"}
                                          </span>
                                          <span className="rounded-full bg-[#f0f2fb] px-2.5 py-1">
                                            Appointment slot:{" "}
                                            {rule.appointment_slot_limit_enabled
                                              ? rule.appointment_slot_limit
                                              : "Unlimited"}
                                          </span>
                                          <span className="rounded-full bg-[#f0f2fb] px-2.5 py-1">
                                            Walk-in daily:{" "}
                                            {rule.walkin_daily_limit_enabled
                                              ? rule.walkin_daily_limit
                                              : "Unlimited"}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            editCapacityRule(rule)
                                          }
                                          className="rounded-lg border border-[#e0e4ef] px-3 py-2 text-sm hover:bg-[#f8f9ff]"
                                        >
                                          Edit
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeleteCapacityRule(rule.id)
                                          }
                                          disabled={
                                            deletingRuleId === rule.id
                                          }
                                          className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                        >
                                          {deletingRuleId === rule.id
                                            ? "Deleting..."
                                            : "Delete"}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Capacity editor */}
                            {editingCapacity && (
                              <div className="rounded-xl border border-[#dfe3ed] bg-[#fafbff] p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <h3 className="text-lg font-semibold">
                                    {capacityDraft.id
                                      ? "Edit Capacity Rule"
                                      : "Add Capacity Rule"}
                                  </h3>

                                  <button
                                    type="button"
                                    onClick={cancelCapacityEdit}
                                    className="text-sm text-[#68758d] hover:text-red-600"
                                  >
                                    Cancel
                                  </button>
                                </div>

                                <div className="mt-5">
                                  <label className="text-sm font-medium">
                                    Apply capacity to
                                  </label>

                                  <select
                                    value={capacityDraft.scope_type}
                                    onChange={(event) => {
                                      const scope = event.target
                                        .value as CapacityScope;

                                      updateCapacityDraft("scope_type", scope);
                                      updateCapacityDraft("department_id", "");
                                    }}
                                    className={inputClass}
                                  >
                                    <option value="clinic">
                                      Entire clinic
                                    </option>
                                    <option value="department">
                                      Individual department
                                    </option>
                                    <option value="doctor" disabled>
                                      Individual doctor (available after doctor setup)
                                    </option>
                                    <option value="section" disabled>
                                      Department section (available after section setup)
                                    </option>
                                  </select>
                                </div>

                                {capacityDraft.scope_type === "department" && (
                                  <div className="mt-4">
                                    <label className="text-sm font-medium">
                                      Select department
                                    </label>

                                    <select
                                      value={capacityDraft.department_id}
                                      onChange={(event) =>
                                        updateCapacityDraft(
                                          "department_id",
                                          event.target.value
                                        )
                                      }
                                      className={inputClass}
                                    >
                                      <option value="">
                                        Choose a department
                                      </option>

                                      {departments
                                        .filter((department) => department.is_active)
                                        .map((department) => (
                                          <option
                                            key={department.id}
                                            value={department.id}
                                          >
                                            {department.name}
                                          </option>
                                        ))}
                                    </select>

                                    {departments.filter((d) => d.is_active)
                                      .length === 0 && (
                                      <p className="mt-2 text-sm text-amber-700">
                                        No active departments are available.
                                        Create a department first.
                                      </p>
                                    )}
                                  </div>
                                )}

                                <div className="mt-6 space-y-4">
                                  <div>
                                    <h4 className="font-semibold">
                                      Appointment Limits
                                    </h4>
                                    <p className="mt-1 text-sm text-[#68758d]">
                                      These limits apply to appointment
                                      bookings only.
                                    </p>
                                  </div>

                                  {renderLimitInput(
                                    "Daily appointment limit",
                                    "Maximum appointments allowed per business day.",
                                    capacityDraft.appointment_daily_limit_enabled,
                                    capacityDraft.appointment_daily_limit,
                                    (value) =>
                                      updateCapacityDraft(
                                        "appointment_daily_limit_enabled",
                                        value
                                      ),
                                    (value) =>
                                      updateCapacityDraft(
                                        "appointment_daily_limit",
                                        value
                                      )
                                  )}

                                  {renderLimitInput(
                                    "Appointment time-slot limit",
                                    "Maximum appointments allowed for the same start-time slot.",
                                    capacityDraft.appointment_slot_limit_enabled,
                                    capacityDraft.appointment_slot_limit,
                                    (value) =>
                                      updateCapacityDraft(
                                        "appointment_slot_limit_enabled",
                                        value
                                      ),
                                    (value) =>
                                      updateCapacityDraft(
                                        "appointment_slot_limit",
                                        value
                                      )
                                  )}
                                </div>

                                <div className="mt-6 space-y-4">
                                  <div>
                                    <h4 className="font-semibold">
                                      Walk-in Limits
                                    </h4>
                                    <p className="mt-1 text-sm text-[#68758d]">
                                      These limits apply to walk-in
                                      registrations only.
                                    </p>
                                  </div>

                                  {renderLimitInput(
                                    "Daily walk-in limit",
                                    "Maximum walk-in registrations allowed per business day.",
                                    capacityDraft.walkin_daily_limit_enabled,
                                    capacityDraft.walkin_daily_limit,
                                    (value) =>
                                      updateCapacityDraft(
                                        "walkin_daily_limit_enabled",
                                        value
                                      ),
                                    (value) =>
                                      updateCapacityDraft(
                                        "walkin_daily_limit",
                                        value
                                      )
                                  )}
                                </div>

                                <div className="mt-6 border-t border-[#e5e8f0] pt-5">
                                  {capacityMessage && (
                                    <p
                                      className={`mb-4 text-sm ${
                                        capacitySuccess
                                          ? "text-emerald-700"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {capacityMessage}
                                    </p>
                                  )}

                                  <div className="flex flex-wrap justify-end gap-3">
                                    <button
                                      type="button"
                                      onClick={cancelCapacityEdit}
                                      className="rounded-lg border border-[#dfe3ed] px-5 py-2.5 text-sm font-medium hover:bg-white"
                                    >
                                      Cancel
                                    </button>

                                    <button
                                      type="button"
                                      onClick={handleSaveCapacityRule}
                                      disabled={
                                        capacitySaving ||
                                        (capacityDraft.scope_type ===
                                          "department" &&
                                          departments.filter((d) => d.is_active)
                                            .length === 0)
                                      }
                                      className="rounded-lg bg-[#6557ff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5145e5] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {capacitySaving
                                        ? "Saving..."
                                        : "Save Capacity Rule"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {capacityMessage && !editingCapacity && (
                              <p
                                className={`text-sm ${
                                  capacitySuccess
                                    ? "text-emerald-700"
                                    : "text-red-600"
                                }`}
                              >
                                {capacityMessage}
                              </p>
                            )}

                            <div className="rounded-lg bg-[#f4f6fc] p-4 text-sm text-[#68758d]">
                              <strong className="text-[#27324b]">
                                How capacity works:
                              </strong>
                              <ul className="mt-2 list-disc space-y-1 pl-5">
                                <li>
                                  Disabled limits mean unlimited registration
                                  for that category.
                                </li>
                                <li>
                                  Appointment and walk-in limits are independent.
                                </li>
                                <li>
                                  When multiple applicable limits are enabled,
                                  every limit must have remaining capacity.
                                </li>
                                <li>
                                  Actual capacity enforcement will be added to
                                  the database registration process.
                                </li>
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-[#68758d]">
                              The {section.label.toLowerCase()} settings
                              interface will be connected to its existing
                              SamayQ configuration next.
                            </p>

                            <p className="mt-2 text-xs text-[#8791a5]">
                              No settings are being changed or saved here yet.
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        ) : (
          <section className="mt-8 rounded-xl border border-[#e0e4ef] bg-white p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Departments</h2>
                <p className="mt-1 text-sm text-[#68758d]">
                  Active and inactive departments for this clinic.
                </p>
              </div>

              <span className="rounded-full bg-[#f0f2fb] px-3 py-1.5 text-sm text-[#526581]">
                {departments.length} total
              </span>
            </div>

            {departments.length === 0 ? (
              <p className="mt-6 rounded-lg bg-[#f8f9ff] p-4 text-sm text-[#68758d]">
                No departments were found for this clinic.
              </p>
            ) : (
              <div className="mt-5 divide-y divide-[#edf0f6]">
                {departments.map((department) => (
                  <div
                    key={department.id}
                    id={`department-${department.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div>
                      <p className="font-medium">{department.name}</p>
                      <p className="mt-1 text-xs text-[#8791a5]">
                        Department ID: {department.id}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        department.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {department.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
