
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendTeamInvitation } from "./actions";

type StaffRole = "administrator" | "receptionist" | "doctor";

type Department = {
  id: string;
  name: string;
};

type Doctor = {
  id: string;
  full_name: string;
  departmentIds: string[];
};

type Props = {
  clinicId: string;
};

const screenOptions = [
  { id: "waitlist", label: "Waitlist" },
  { id: "reservations", label: "Reservations" },
  { id: "customers", label: "Patients / Customers" },
  { id: "insights", label: "Insights" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
  { id: "departments", label: "Departments" },
  { id: "team", label: "Team Management" },
  { id: "billing", label: "Billing" },
];

export default function TeamManagementClient({ clinicId }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");

  const [role, setRole] = useState<StaffRole>("receptionist");

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

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">(
    "success"
  );
  const [invitationLink, setInvitationLink] = useState("");

  // Load active departments and doctors assigned to this clinic.
  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);
      setOptionsError("");

      try {
        const supabase = createClient();

        const {
          data: departmentRows,
          error: departmentError,
        } = await supabase
          .from("departments")
          .select("id, name")
          .eq("clinic_id", clinicId)
          .eq("is_active", true)
          .order("name");

        if (departmentError) throw departmentError;

        const {
          data: assignments,
          error: assignmentError,
        } = await supabase
          .from("doctor_clinic_assignments")
          .select("doctor_id, department_id")
          .eq("clinic_id", clinicId)
          .eq("is_active", true);

        if (assignmentError) throw assignmentError;

        const doctorIds = [
          ...new Set(
            (assignments ?? []).map((item) => item.doctor_id)
          ),
        ];

        let doctorRows: { id: string; full_name: string }[] = [];

        if (doctorIds.length > 0) {
          const {
            data,
            error,
          } = await supabase
            .from("doctors")
            .select("id, full_name")
            .eq("is_active", true)
            .in("id", doctorIds)
            .order("full_name");

          if (error) throw error;

          doctorRows = data ?? [];
        }

        const mappedDoctors: Doctor[] = doctorRows.map((doctor) => ({
          id: doctor.id,
          full_name: doctor.full_name,
          departmentIds: [
            ...new Set(
              (assignments ?? [])
                .filter(
                  (assignment) =>
                    assignment.doctor_id === doctor.id
                )
                .map((assignment) => assignment.department_id)
                .filter((id): id is string => Boolean(id))
            ),
          ],
        }));

        if (!cancelled) {
          setDepartments(departmentRows ?? []);
          setDoctors(mappedDoctors);
        }
      } catch (error) {
        console.error("Team options loading error:", error);

        if (!cancelled) {
          setOptionsError(
            "Unable to load departments and doctors. Check your clinic permissions and try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  // Show all doctors if no department is selected.
  // Otherwise show doctors assigned to selected departments.
  const visibleDoctors = useMemo(() => {
    if (selectedDepartments.length === 0) {
      return doctors;
    }

    return doctors.filter((doctor) =>
      doctor.departmentIds.some((departmentId) =>
        selectedDepartments.includes(departmentId)
      )
    );
  }, [doctors, selectedDepartments]);

  // Common selection toggle.
  function toggleValue(
    value: string,
    current: string[],
    setter: (next: string[]) => void
  ) {
    setter(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  // Change role and apply doctor-specific selection rules.
  function handleRoleChange(nextRole: StaffRole) {
    setRole(nextRole);

    if (nextRole === "doctor") {
      setRestrictDoctors(true);
      setSelectedDoctors([]);
      setName("");
      setPhone("");
    } else {
      setRestrictDoctors(false);
      setSelectedDoctors([]);
    }
  }

  // Department selection also removes doctors that are no longer visible.
  function handleDepartmentToggle(departmentId: string) {
    const nextDepartments = selectedDepartments.includes(departmentId)
      ? selectedDepartments.filter((id) => id !== departmentId)
      : [...selectedDepartments, departmentId];

    setSelectedDepartments(nextDepartments);

    setSelectedDoctors((currentDoctors) =>
      currentDoctors.filter((doctorId) => {
        const doctor = doctors.find(
          (item) => item.id === doctorId
        );

        if (nextDepartments.length === 0) {
          return true;
        }

        return Boolean(
          doctor?.departmentIds.some((id) =>
            nextDepartments.includes(id)
          )
        );
      })
    );
  }

  // Select a doctor.
  function handleDoctorSelection(doctorId: string) {
    if (role === "doctor") {
      // Doctor login: exactly one existing doctor.
      setSelectedDoctors([doctorId]);
      return;
    }

    // Administrator/receptionist: multiple doctors allowed.
    toggleValue(
      doctorId,
      selectedDoctors,
      setSelectedDoctors
    );
  }

  // Reset invitation form.
  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setCountryCode("+91");

    setRole("receptionist");

    setSelectedScreens(["waitlist", "reservations"]);
    setSelectedDepartments([]);

    setRestrictDoctors(false);
    setSelectedDoctors([]);
  }

  // Submit invitation.
  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (sending) return;

    setNotice("");
    setInvitationLink("");

    if (!email.trim()) {
      setNoticeType("error");
      setNotice("Enter the staff member's email address.");
      return;
    }

    if (selectedScreens.length === 0) {
      setNoticeType("error");
      setNotice("Select at least one screen for this staff member.");
      return;
    }

    if (role === "doctor" && selectedDoctors.length !== 1) {
      setNoticeType("error");
      setNotice("Select exactly one doctor for this login.");
      return;
    }

    if (
      role !== "doctor" &&
      restrictDoctors &&
      selectedDoctors.length === 0
    ) {
      setNoticeType("error");
      setNotice("Select at least one doctor.");
      return;
    }

    if (optionsError) {
      setNoticeType("error");
      setNotice(
        "Department and doctor information could not be loaded. Please refresh the page and try again."
      );
      return;
    }

    if (loadingOptions) {
      setNoticeType("error");
      setNotice("Please wait until doctor information has loaded.");
      return;
    }

    const fullPhone = phone.trim()
      ? `${countryCode}${phone.trim()}`
      : undefined;

    try {
      setSending(true);

      const result = await sendTeamInvitation({
        clinicId,
        fullName: role === "doctor" ? undefined : name.trim(),
        email: email.trim(),
        phone: role === "doctor" ? undefined : fullPhone,
        role,
        screenPermissions: selectedScreens,
        departmentIds: selectedDepartments,
        restrictDoctors: role === "doctor" ? true : restrictDoctors,
        doctorIds: role === "doctor"
          ? selectedDoctors
          : restrictDoctors
            ? selectedDoctors
            : [],
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
      console.error("Invitation submit error:", error);

      setNoticeType("error");
      setNotice("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  // Copy invitation link.
  async function copyInvitationLink() {
    if (!invitationLink) return;

    try {
      await navigator.clipboard.writeText(invitationLink);

      setNoticeType("success");
      setNotice("Invitation link copied.");
    } catch {
      setNoticeType("error");
      setNotice("Unable to copy the invitation link.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900">
          Team Management
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Invite staff members and control which parts of your clinic
          they can access.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        {/* STAFF DETAILS */}

        <section>
          <h2 className="text-base font-semibold text-slate-900">
            Staff details
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* Full name is not required for doctor invitations. */}
            {role !== "doctor" && (
              <div>
                <label
                  htmlFor="staff-name"
                  className="block text-sm font-medium text-slate-700"
                >
                  Full name (Optional)
                </label>

                <input
                  id="staff-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  placeholder="Enter full name"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="staff-email"
                className="block text-sm font-medium text-slate-700"
              >
                Email address *
              </label>

              <input
                id="staff-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
                placeholder="staff@example.com"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </div>

            {/* Phone is not required for doctor invitations. */}
            {role !== "doctor" && (
              <div>
                <label
                  htmlFor="staff-phone"
                  className="block text-sm font-medium text-slate-700"
                >
                  Phone number (Optional)
                </label>

                <div className="mt-2 flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(event) =>
                      setCountryCode(event.target.value)
                    }
                    className="w-24 rounded-lg border border-slate-300 px-2 py-2.5 text-sm"
                    aria-label="Country code"
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                    <option value="+971">+971</option>
                  </select>

                  <input
                    id="staff-phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    maxLength={20}
                    placeholder="Phone number"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="staff-role"
                className="block text-sm font-medium text-slate-700"
              >
                Staff role
              </label>

              <select
                id="staff-role"
                value={role}
                onChange={(event) =>
                  handleRoleChange(event.target.value as StaffRole)
                }
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
              >
                <option value="receptionist">Receptionist</option>
                <option value="doctor">Doctor</option>
                <option value="administrator">Administrator</option>
              </select>
            </div>
          </div>

          {role === "doctor" && (
            <p className="mt-3 rounded-lg bg-violet-50 p-3 text-sm text-violet-800">
              Doctor login will be linked to the existing doctor you
              select below. The existing doctor's name and phone details
              will not be changed.
            </p>
          )}
        </section>

        <div className="border-t border-slate-100" />

        {/* SCREEN PERMISSIONS */}

        <section>
          <h2 className="text-base font-semibold text-slate-900">
            Screen permissions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select the screens this staff member can access.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {screenOptions.map((screen) => (
              <label
                key={screen.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedScreens.includes(screen.id)}
                  onChange={() =>
                    toggleValue(
                      screen.id,
                      selectedScreens,
                      setSelectedScreens
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />

                {screen.label}
              </label>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Screen permissions are available for Administrator,
            Receptionist and Doctor accounts.
          </p>
        </section>

        <div className="border-t border-slate-100" />

        {/* DEPARTMENT ACCESS */}

        <section>
          <h2 className="text-base font-semibold text-slate-900">
            Department access
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Leave all departments unselected to allow access to every
            department. Select departments to restrict access.
          </p>

          {loadingOptions ? (
            <p className="mt-4 text-sm text-slate-500">
              Loading departments and doctors...
            </p>
          ) : optionsError ? (
            <p className="mt-4 text-sm text-red-600">
              {optionsError}
            </p>
          ) : departments.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No active departments are available for this clinic.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((department) => (
                <label
                  key={department.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedDepartments.includes(department.id)}
                    onChange={() =>
                      handleDepartmentToggle(department.id)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />

                  {department.name}
                </label>
              ))}
            </div>
          )}
        </section>

        <div className="border-t border-slate-100" />

        {/* DOCTOR ACCESS */}

        <section>
          <h2 className="text-base font-semibold text-slate-900">
            Doctor access
          </h2>

          {role === "doctor" ? (
            <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-4">
              <p className="text-sm font-semibold text-violet-900">
                Doctor-specific login
              </p>

              <p className="mt-1 text-sm text-violet-700">
                Select exactly one existing doctor. This email will
                become that doctor's login.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-500">
                Enable this option to allow access only to selected
                doctors. When disabled, all doctors within the permitted
                department scope are available.
              </p>

              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={restrictDoctors}
                  onChange={(event) => {
                    setRestrictDoctors(event.target.checked);

                    if (!event.target.checked) {
                      setSelectedDoctors([]);
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />

                <span className="text-sm font-medium text-slate-800">
                  Restrict access to selected doctors only
                </span>
              </label>
            </>
          )}

          {(role === "doctor" || restrictDoctors) && (
            <div className="mt-4">
              {loadingOptions ? (
                <p className="text-sm text-slate-500">
                  Loading doctors...
                </p>
              ) : optionsError ? (
                <p className="text-sm text-red-600">
                  {optionsError}
                </p>
              ) : visibleDoctors.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No active doctors are available for the selected
                  department(s).
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleDoctors.map((doctor) => (
                    <label
                      key={doctor.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <input
                        type={role === "doctor" ? "radio" : "checkbox"}
                        name={
                          role === "doctor"
                            ? "selected-doctor"
                            : undefined
                        }
                        checked={selectedDoctors.includes(doctor.id)}
                        onChange={() =>
                          handleDoctorSelection(doctor.id)
                        }
                        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />

                      {doctor.full_name}
                    </label>
                  ))}
                </div>
              )}

              {selectedDoctors.length > 0 && (
                <p className="mt-3 text-xs text-slate-500">
                  {selectedDoctors.length} doctor(s) selected.
                  {role === "doctor"
                    ? " This email will be linked to this doctor."
                    : ""}
                </p>
              )}
            </div>
          )}
        </section>

        {/* NOTIFICATIONS */}

        {notice && (
          <div
            role="status"
            aria-live="polite"
            className={`rounded-lg p-3 text-sm ${
              noticeType === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {notice}
          </div>
        )}

        {/* INVITATION LINK */}

        {invitationLink && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-900">
              Invitation link
            </p>

            <p className="mt-1 break-all text-xs text-green-800">
              {invitationLink}
            </p>

            <button
              type="button"
              onClick={copyInvitationLink}
              className="mt-3 rounded-lg border border-green-300 bg-white px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
            >
              Copy invitation link
            </button>
          </div>
        )}

        {/* ACTION BUTTONS */}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={resetForm}
            disabled={sending}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Clear
          </button>

          <button
            type="submit"
            disabled={
              sending ||
              loadingOptions ||
              Boolean(optionsError)
            }
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Sending invitation..." : "Send invitation"}
          </button>
        </div>

        <p className="text-xs leading-5 text-slate-400">
          Invitation links expire after 7 days. Screen permissions,
          department restrictions and doctor restrictions are saved
          when the invited user accepts the invitation. An invitation
          email is sent through EmailJS.
        </p>
      </form>
    </main>
  );
}
