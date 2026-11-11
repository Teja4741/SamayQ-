"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendTeamInvitation } from "./actions";
type MemberRole = "administrator" | "receptionist" | "doctor";
type ScreenOption = {
  id: string;
  label: string;
  description: string;
};
type Department = {
  id: string;
  name: string;
};
type Doctor = {
  id: string;
  name: string;
  departmentIds: string[];
};
type Props = {
  clinicId: string;
};
const screenOptions: ScreenOption[] = [
  {
    id: "waitlist",
    label: "Waitlist",
    description: "Run the live line: add, call, seat and remove people.",
  },
  {
    id: "reservations",
    label: "Reservations",
    description: "Take, move and cancel appointment bookings.",
  },
  {
    id: "customers",
    label: "Patients",
    description: "View patient details, visits and no-show history.",
  },
  {
    id: "insights",
    label: "Insights",
    description: "Business analytics, peak hours and repeat visitors.",
  },
  {
    id: "history",
    label: "History",
    description: "Review past business days and waiting times.",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Manage clinic settings and notifications.",
  },
  {
    id: "departments",
    label: "Section & Department Settings",
    description: "Manage departments, sections and their rules.",
  },
  {
    id: "team",
    label: "Team",
    description: "Invite people and manage their access.",
  },
  {
    id: "billing",
    label: "Billing & plan",
    description: "Manage subscription and billing.",
  },
];
const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100";
const labelClass = "block text-sm font-medium text-slate-600";
export default function TeamManagementClient({ clinicId }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("receptionist");
  const [selectedScreens, setSelectedScreens] = useState<string[]>([
    "waitlist",
    "reservations",
  ]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
    []
  );
  const [restrictDoctors, setRestrictDoctors] = useState(false);
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<
    "success" | "error" | ""
  >("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [sending, setSending] = useState(false);
  const [invitationLink, setInvitationLink] = useState("");
  // Load departments and doctors belonging to this clinic.
  useEffect(() => {
    let cancelled = false;
    async function loadClinicOptions() {
      setLoadingOptions(true);
      setOptionsError("");
      const supabase = createClient();
      const { data: departmentRows, error: departmentError } =
        await supabase
          .from("departments")
          .select("id, name")
          .eq("clinic_id", clinicId)
          .eq("is_active", true)
          .order("name");
      if (departmentError) {
        if (!cancelled) {
          setOptionsError(
            "Could not load departments. Check the departments table SELECT RLS policy."
          );
          setLoadingOptions(false);
        }
        return;
      }
      const { data: assignmentRows, error: assignmentError } =
        await supabase
          .from("doctor_clinic_assignments")
          .select("doctor_id, department_id")
          .eq("clinic_id", clinicId)
          .eq("is_active", true);
      if (assignmentError) {
        if (!cancelled) {
          setOptionsError(
            "Could not load doctors for this clinic. Check doctor assignment SELECT permissions."
          );
          setDepartments(
            (departmentRows ?? []).map((row) => ({
              id: row.id,
              name: row.name,
            }))
          );
          setLoadingOptions(false);
        }
        return;
      }
      const assignments = assignmentRows ?? [];
      const doctorIds = [
        ...new Set(assignments.map((row) => row.doctor_id)),
      ];
      let doctorOptions: Doctor[] = [];
      if (doctorIds.length > 0) {
        const { data: doctorRows, error: doctorsError } =
          await supabase
            .from("doctors")
            .select("id, full_name")
            .in("id", doctorIds)
            .eq("is_active", true);
        if (doctorsError) {
          if (!cancelled) {
            setOptionsError(
              "Could not load doctor records. Check doctors SELECT permissions."
            );
          }
        } else {
          const doctorRecords = doctorRows ?? [];
          doctorOptions = doctorRecords.map((doctor) => ({
            id: doctor.id,
            name: doctor.full_name?.trim() || "Unnamed doctor",
            departmentIds: assignments
              .filter(
                (row) => row.doctor_id === doctor.id && row.department_id
              )
              .map((row) => row.department_id as string),
          }));
        }
      }
      if (!cancelled) {
        setDepartments(
          (departmentRows ?? []).map((row) => ({
            id: row.id,
            name: row.name,
          }))
        );
        setDoctors(doctorOptions);
        setLoadingOptions(false);
      }
    }
    void loadClinicOptions();
    return () => {
      cancelled = true;
    };
  }, [clinicId]);
  // Toggle checkbox selections.
  function toggleSelection(
    value: string,
    current: string[],
    update: (values: string[]) => void
  ) {
    update(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }
  // Reset the invitation form.
  function resetForm() {
    setName("");
    setPhone("");
    setCountryCode("+91");
    setEmail("");
    setRole("receptionist");
    setSelectedScreens(["waitlist", "reservations"]);
    setSelectedDepartments([]);
    setRestrictDoctors(false);
    setSelectedDoctors([]);
  }
  // Send invitation.
  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    if (sending) return;
    setNotice("");
    setNoticeType("");
    setInvitationLink("");
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setNoticeType("error");
      setNotice("Please enter the staff member's email address.");
      return;
    }
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      setNoticeType("error");
      setNotice("Please enter a valid email address.");
      return;
    }
    if (
      phone.trim() &&
      !/^[0-9\s()-]{7,15}$/.test(phone.trim())
    ) {
      setNoticeType("error");
      setNotice("Please enter a valid phone number.");
      return;
    }
    if (role === "receptionist" && selectedScreens.length === 0) {
      setNoticeType("error");
      setNotice("Select at least one screen permission.");
      return;
    }
    if (
      restrictDoctors &&
      selectedDoctors.length === 0
    ) {
      setNoticeType("error");
      setNotice(
        "Select at least one doctor or turn off doctor restriction."
      );
      return;
    }
    try {
      setSending(true);
      const result = await sendTeamInvitation({
        clinicId,
        fullName: name.trim(),
        email: normalizedEmail,
        phone: phone.trim()
          ? `${countryCode} ${phone.trim()}`
          : "",
        role,
        screenPermissions:
          role === "receptionist" ? selectedScreens : [],
      });
      if (!result.success) {
        setNoticeType("error");
        setNotice(result.message);
        return;
      }
      setNoticeType("success");
      setNotice(result.message);
      setInvitationLink(result.invitationLink ?? "");
      resetForm();
    } catch (error) {
      console.error("Invitation submission error:", error);
      setNoticeType("error");
      setNotice(
        "Something went wrong while generating the invitation link. Please try again."
      );
    } finally {
      setSending(false);
    }
  }
  async function copyInvitationLink() {
    if (!invitationLink) return;
    try {
      await navigator.clipboard.writeText(invitationLink);
      setNoticeType("success");
      setNotice("Invitation link copied. Share it privately with the invited member.");
    } catch {
      setNoticeType("error");
      setNotice("Copy failed. Select the link and copy it manually.");
    }
  }
  // Filter doctors according to selected departments.
  const visibleDoctors = selectedDepartments.length
    ? doctors.filter((doctor) =>
      doctor.departmentIds.some((id) =>
        selectedDepartments.includes(id)
      )
    )
    : doctors;
  return (
    <div className="min-h-screen">
      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">
            Invite a team member
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter the member's details and configure their access.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label
                htmlFor="memberName"
                className={labelClass}
              >
                Name (optional)
              </label>
              <input
                id="memberName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh"
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="memberPhone"
                className={labelClass}
              >
                Phone number (optional)
              </label>
              <div className="flex gap-2">
                <select
                  aria-label="Country code"
                  value={countryCode}
                  onChange={(e) =>
                    setCountryCode(e.target.value)
                  }
                  className={`${inputClass} w-[105px] shrink-0`}
                >
                  <option value="+91">IN +91</option>
                  <option value="+1">US +1</option>
                  <option value="+44">UK +44</option>
                  <option value="+971">UAE +971</option>
                </select>
                <input
                  id="memberPhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="memberEmail"
                className={labelClass}
              >
                Email
              </label>
              <input
                id="memberEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@business.com"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="memberRole"
                className={labelClass}
              >
                Role
              </label>
              <select
                id="memberRole"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as MemberRole)
                }
                className={inputClass}
              >
                <option value="administrator">
                  Clinic Administrator
                </option>
                <option value="receptionist">
                  Receptionist
                </option>
                <option value="doctor">
                  Doctor
                </option>
              </select>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-medium text-slate-600">
              Screens they can open
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {screenOptions.map((screen) => {
                const checked = selectedScreens.includes(
                  screen.id
                );
                return (
                  <label
                    key={screen.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked
                      ? "border-violet-400 bg-violet-50"
                      : "border-slate-200 hover:border-violet-200"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        toggleSelection(
                          screen.id,
                          selectedScreens,
                          setSelectedScreens
                        )
                      }
                      className="mt-1 h-4 w-4 accent-violet-600"
                    />
                    <span>
                      <span className="block text-sm font-medium">
                        {screen.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {screen.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-medium text-slate-600">
              Department access
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Departments shown here belong to the selected
              clinic. Selecting a department filters the doctor
              list below.
            </p>
            {loadingOptions && (
              <p className="mt-3 text-sm text-slate-500">
                Loading clinic departments and doctors...
              </p>
            )}
            {optionsError && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
              >
                {optionsError}
              </p>
            )}
            {!loadingOptions &&
              departments.length === 0 && (
                <p className="mt-3 text-sm text-slate-500">
                  No active departments were found for this clinic.
                </p>
              )}
            {departments.length > 0 && (
              <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
                {departments.map((department) => (
                  <label
                    key={department.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDepartments.includes(
                        department.id
                      )}
                      onChange={() =>
                        toggleSelection(
                          department.id,
                          selectedDepartments,
                          setSelectedDepartments
                        )
                      }
                      className="h-4 w-4 accent-violet-600"
                    />
                    {department.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="mt-5">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={restrictDoctors}
                onChange={(e) => {
                  setRestrictDoctors(e.target.checked);
                  if (!e.target.checked) {
                    setSelectedDoctors([]);
                  }
                }}
                className="h-4 w-4 accent-violet-600"
              />
              Restrict access to specific doctors
            </label>
            {restrictDoctors && (
              <div className="mt-3 rounded-xl border border-slate-200 p-4">
                {visibleDoctors.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No doctors found for the selected department(s).
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {visibleDoctors.map((doctor) => (
                      <label
                        key={doctor.id}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDoctors.includes(
                            doctor.id
                          )}
                          onChange={() =>
                            toggleSelection(
                              doctor.id,
                              selectedDoctors,
                              setSelectedDoctors
                            )
                          }
                          className="h-4 w-4 accent-violet-600"
                        />
                        {doctor.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={sending}
              className="rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending
                ? "Generating link..."
                : "Generate Invitation Link"}
            </button>
          </div>
          {notice && (
            <p
              role="status"
              aria-live="polite"
              className={`mt-4 rounded-lg p-3 text-sm leading-6 ${noticeType === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-700"
                }`}
            >
              {notice}
            </p>
          )}
          {invitationLink && (
            <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
              <h3 className="text-sm font-semibold text-violet-900">Invitation link ready</h3>
              <p className="mt-1 text-xs text-violet-700">Copy and share privately. Expires after 24 hours; single use.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input readOnly aria-label="Generated invitation link" value={invitationLink}
                  onFocus={(event) => event.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs text-slate-700" />
                <button type="button" onClick={copyInvitationLink}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">Copy Link</button>
              </div>
            </div>
          )}
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Invitation links are generated using Supabase Auth; no email is sent.
            Screen permissions are saved to the database when the invitation is accepted. Department and doctor-specific restrictions are currently not persisted.
          </p>
        </section>
      </form>
      <section className="mt-7 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">
          Team invitations
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Staff invitations will be managed through the
          invitation database.
        </p>
        <div className="mt-5 rounded-lg bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">
            Invitation workflow
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Generate a link, copy it and share it privately with the staff member.
            The link expires after 24 hours. After acceptance, the clinic
            membership will be activated.
          </p>
        </div>
      </section>
    </div>
  );
}
