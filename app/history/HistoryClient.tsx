
  "use client";

  import { useCallback, useEffect, useMemo, useState } from "react";
  import { createClient } from "@/lib/supabase/client";

  type Clinic = { id: string; name: string };
  type Row = Record<string, any>;

  type HistoryClientProps = {
    clinicId: string;
    clinicName: string;
    clinics: Clinic[];
    isPlatformAdmin: boolean;
  };

  const DAY_MS = 24 * 60 * 60 * 1000;
  const HISTORY_DAYS = 90;

  function dateKey(value: string | null | undefined) {
    if (!value) return "";
    return value.slice(0, 10);
  }

  function formatDate(value: string) {
    return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatWait(minutes: number | null) {
    if (minutes === null || !Number.isFinite(minutes)) return "—";
    if (minutes < 60) return `${Math.round(minutes)} min`;

    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins ? `${hours}h ${mins}m` : `${hours}h`;
  }

  export default function HistoryClient({
    clinicId,
    clinicName,
    clinics,
    isPlatformAdmin,
  }: HistoryClientProps) {
    const supabase = useMemo(() => createClient(), []);

    const [tab, setTab] = useState<"queue" | "appointments">("queue");
    const [departmentId, setDepartmentId] = useState("all");
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [departments, setDepartments] = useState<Row[]>([]);
    const [queues, setQueues] = useState<Row[]>([]);
    const [entries, setEntries] = useState<Row[]>([]);
    const [appointments, setAppointments] = useState<Row[]>([]);
    const [events, setEvents] = useState<Row[]>([]);
    const [calls, setCalls] = useState<Row[]>([]);
    const [patients, setPatients] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadHistory = useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const fromDate = new Date(Date.now() - HISTORY_DAYS * DAY_MS)
          .toISOString()
          .slice(0, 10);

        const [
          departmentsResult,
          queuesResult,
          appointmentsResult,
        ] = await Promise.all([
          supabase
            .from("departments")
            .select("id, name")
            .eq("clinic_id", clinicId)
            .order("name"),

          supabase
            .from("queues")
            .select("id, name, department_id, clinic_id")
            .eq("clinic_id", clinicId),

          supabase
            .from("appointments")
            .select(
              "id, clinic_id, patient_id, doctor_clinic_assignment_id, appointment_date, start_time, booking_type, status, notes, created_at, duration_minutes"
            )
            .eq("clinic_id", clinicId)
            .gte("appointment_date", fromDate)
            .order("appointment_date", { ascending: false }),
        ]);

        if (departmentsResult.error) throw departmentsResult.error;
        if (queuesResult.error) throw queuesResult.error;
        if (appointmentsResult.error) throw appointmentsResult.error;

        const clinicQueues = queuesResult.data ?? [];
        const queueIds = clinicQueues.map((queue) => queue.id);

        setDepartments(departmentsResult.data ?? []);
        setQueues(clinicQueues);
        setAppointments(appointmentsResult.data ?? []);

        let queueEntries: Row[] = [];
        let queueEvents: Row[] = [];
        let callAttempts: Row[] = [];

        if (queueIds.length > 0) {
          // Keep historical queue entries across business days.
          // Do not add a current business_date filter here: the 3 AM rollover
          // should hide old entries from operational views, not from History.
          const entriesResult = await supabase
            .from("queue_entries")
            .select(
              "id, queue_id, patient_id, appointment_id, entry_type, token_number, status, joined_at, completed_at, created_at, current_room_id"
            )
            .in("queue_id", queueIds)
            .gte("joined_at", `${fromDate}T00:00:00`)
            .order("joined_at", { ascending: false });

          if (entriesResult.error) throw entriesResult.error;

          queueEntries = entriesResult.data ?? [];

          const entryIds = queueEntries.map((entry) => entry.id);

          if (entryIds.length > 0) {
            const [eventsResult, callsResult] = await Promise.all([
              supabase
                .from("queue_events")
                .select("id, queue_entry_id, event_type, created_at, notes")
                .in("queue_entry_id", entryIds)
                .order("created_at"),

              supabase
                .from("queue_call_attempts")
                .select("id, queue_entry_id, status, call_method, created_at")
                .in("queue_entry_id", entryIds),
            ]);

            if (eventsResult.error) throw eventsResult.error;
            if (callsResult.error) throw callsResult.error;

            queueEvents = eventsResult.data ?? [];
            callAttempts = callsResult.data ?? [];
          }
        }

        setEntries(queueEntries);
        setEvents(queueEvents);
        setCalls(callAttempts);

        const patientIds = [
          ...new Set([
            ...queueEntries.map((entry) => entry.patient_id),
            ...(appointmentsResult.data ?? []).map(
              (appointment) => appointment.patient_id
            ),
          ].filter(Boolean)),
        ];

        if (patientIds.length) {
          const patientsResult = await supabase
            .from("patients")
            .select("id, full_name, phone")
            .in("id", patientIds);

          if (patientsResult.error) throw patientsResult.error;
          setPatients(patientsResult.data ?? []);
        } else {
          setPatients([]);
        }
      } catch (err: unknown) {
        const error = err as {
          message?: string;
          code?: string;
          details?: string | null;
          hint?: string | null;
        };

        // Supabase/PostgREST errors are often plain objects, not Error instances.
        // Log their useful fields so the browser console shows the real failure.
        console.error("History load failed - full details:", {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          raw:
            err && typeof err === "object"
              ? JSON.stringify(err, Object.getOwnPropertyNames(err))
              : String(err),
        });

        setError(
          error?.message ||
            "Unable to load history. Check the browser console for the full error details."
        );
      } finally {
        setLoading(false);
      }
    }, [clinicId, supabase]);

    useEffect(() => {
      void loadHistory();
    }, [loadHistory]);

    const queueById = useMemo(
      () => new Map(queues.map((queue) => [queue.id, queue])),
      [queues]
    );

    const patientById = useMemo(
      () => new Map(patients.map((patient) => [patient.id, patient])),
      [patients]
    );

    const filteredEntries = useMemo(
      () =>
        entries.filter((entry) => {
          const queue = queueById.get(entry.queue_id);
          return (
            departmentId === "all" ||
            queue?.department_id === departmentId
          );
        }),
      [entries, queueById, departmentId]
    );

    const filteredAppointments = useMemo(() => {
      if (departmentId === "all") return appointments;

      const assignmentIds = new Set(
        queues
          .filter((queue) => queue.department_id === departmentId)
          .map((queue) => queue.doctor_clinic_assignment_id)
          .filter(Boolean)
      );

      return appointments.filter((appointment) =>
        assignmentIds.has(appointment.doctor_clinic_assignment_id)
      );
    }, [appointments, queues, departmentId]);

    const days = useMemo(() => {
      const grouped = new Map<string, Row[]>();

      const source = tab === "queue" ? filteredEntries : filteredAppointments;

      for (const item of source) {
        const key =
          tab === "queue"
            ? dateKey(item.joined_at)
            : dateKey(item.appointment_date);

        if (!key) continue;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(item);
      }

      return [...grouped.entries()]
        .map(([date, rows]) => {
          const dayEntryIds = new Set(rows.map((row) => row.id));

          if (tab === "appointments") {
            const completed = rows.filter((row) =>
              ["completed", "complete", "done"].includes(
                String(row.status).toLowerCase()
              )
            ).length;

            const noShows = rows.filter((row) =>
              ["no_show", "no-show", "noshow"].includes(
                String(row.status).toLowerCase()
              )
            ).length;

            return {
              date,
              rows,
              completed,
              noShows,
              total: rows.length,
              averageWait: null as number | null,
              notifications: 0,
            };
          }

          const dayEvents = events.filter((event) =>
            dayEntryIds.has(event.queue_entry_id)
          );

          const waitTimes: number[] = [];

          for (const entry of rows) {
            const calledEvent = dayEvents
              .filter(
                (event) =>
                  event.queue_entry_id === entry.id &&
                  ["called", "called_again"].includes(event.event_type)
              )
              .sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              )[0];

            if (calledEvent && entry.joined_at) {
              const minutes =
                (new Date(calledEvent.created_at).getTime() -
                  new Date(entry.joined_at).getTime()) /
                60000;

              if (minutes >= 0) waitTimes.push(minutes);
            }
          }

          const noShowIds = new Set(
            dayEvents
              .filter((event) =>
                ["no_show", "marked_missed"].includes(event.event_type)
              )
              .map((event) => event.queue_entry_id)
          );

          const noShows = rows.filter(
            (entry) => entry.status === "missed" || noShowIds.has(entry.id)
          ).length;

          return {
            date,
            rows,
            completed: rows.filter((entry) => entry.status === "completed")
              .length,
            noShows,
            total: rows.length,
            averageWait: waitTimes.length
              ? waitTimes.reduce((sum, value) => sum + value, 0) /
                waitTimes.length
              : null,
            notifications: calls.filter((call) =>
              dayEntryIds.has(call.queue_entry_id)
            ).length,
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date));
    }, [
      tab,
      filteredEntries,
      filteredAppointments,
      events,
      calls,
    ]);

    const selectedDay = days.find((day) => day.date === selectedDate);

    return (
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">Dashboard / History</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              History
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Past days. Tap a day for details.
            </p>
            <p className="mt-1 text-sm font-medium text-gray-700">
              {clinicName}
            </p>
          </div>

          {isPlatformAdmin && clinics.length > 0 && (
            <select
              aria-label="Select clinic"
              value={clinicId}
              onChange={(event) => {
                window.location.href = `/history?clinicId=${event.target.value}`;
              }}
              className="rounded-lg border bg-white px-3 py-2 text-sm"
            >
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">Department</span>
            <select
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value);
                setSelectedDate(null);
              }}
              className="min-w-48 rounded-lg border bg-white px-3 py-2"
            >
              <option value="all">All Departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <div className="inline-flex rounded-lg border bg-gray-100 p-1">
            <button
              onClick={() => {
                setTab("queue");
                setSelectedDate(null);
              }}
              className={`rounded-md px-4 py-2 text-sm ${
                tab === "queue"
                  ? "bg-white font-semibold shadow-sm"
                  : "text-gray-600"
              }`}
            >
              Queue
            </button>
            <button
              onClick={() => {
                setTab("appointments");
                setSelectedDate(null);
              }}
              className={`rounded-md px-4 py-2 text-sm ${
                tab === "appointments"
                  ? "bg-white font-semibold shadow-sm"
                  : "text-gray-600"
              }`}
            >
              Appointments
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <button
              onClick={() => void loadHistory()}
              className="mt-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
            Loading history…
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-4 py-4">Completed</th>
                    <th className="px-4 py-4">No-shows</th>
                    <th className="px-4 py-4">Avg wait</th>
                    <th className="px-4 py-4">Total</th>
                    <th className="px-4 py-4">Notifications</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {days.map((day) => (
                    <tr
                      key={day.date}
                      onClick={() =>
                        setSelectedDate(
                          selectedDate === day.date ? null : day.date
                        )
                      }
                      className={`cursor-pointer transition hover:bg-gray-50 ${
                        selectedDate === day.date ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-5 py-4 font-medium text-gray-900">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedDate(
                              selectedDate === day.date ? null : day.date
                            );
                          }}
                          className="text-left hover:underline"
                        >
                          {formatDate(day.date)}
                        </button>
                      </td>
                      <td className="px-4 py-4">{day.completed}</td>
                      <td className="px-4 py-4">{day.noShows}</td>
                      <td className="px-4 py-4">
                        {tab === "queue"
                          ? formatWait(day.averageWait)
                          : "—"}
                      </td>
                      <td className="px-4 py-4">{day.total}</td>
                      <td className="px-4 py-4">
                        {tab === "queue" ? day.notifications : "—"}
                      </td>
                    </tr>
                  ))}

                  {days.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-gray-500"
                      >
                        No history found for this period and department.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-500">
              Showing the last {HISTORY_DAYS} days. Average wait uses the first
              recorded call event for each queue entry. Notifications count
              recorded call attempts, not necessarily delivered messages.
            </p>

            {selectedDay && (
              <section className="overflow-hidden rounded-xl border bg-white">
                <div className="flex flex-col gap-2 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {formatDate(selectedDay.date)}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {tab === "queue"
                        ? "Queue entries for this day"
                        : "Appointments scheduled for this day"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="self-start rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Close details
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-5 py-3">Patient</th>
                        {tab === "queue" ? (
                          <>
                            <th className="px-4 py-3">Token</th>
                            <th className="px-4 py-3">Queue</th>
                            <th className="px-4 py-3">Joined</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Booking type</th>
                          </>
                        )}
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedDay.rows.map((row) => {
                        const patient = patientById.get(row.patient_id);
                        const queue = queueById.get(row.queue_id);

                        return (
                          <tr key={row.id}>
                            <td className="px-5 py-4">
                              <div className="font-medium">
                                {patient?.full_name ?? "Unknown patient"}
                              </div>
                              {patient?.phone && (
                                <div className="mt-1 text-xs text-gray-500">
                                  {patient.phone}
                                </div>
                              )}
                            </td>

                            {tab === "queue" ? (
                              <>
                                <td className="px-4 py-4">
                                  {queue?.token_prefix ?? ""}
                                  {row.token_number ?? "—"}
                                </td>
                                <td className="px-4 py-4">
                                  {queue?.name ?? "—"}
                                </td>
                                <td className="px-4 py-4">
                                  {row.joined_at
                                    ? new Date(row.joined_at).toLocaleTimeString(
                                        "en-IN",
                                        { hour: "2-digit", minute: "2-digit" }
                                      )
                                    : "—"}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-4">
                                  {row.start_time
                                    ? String(row.start_time).slice(0, 5)
                                    : "—"}
                                </td>
                                <td className="px-4 py-4">
                                  {row.booking_type ?? "—"}
                                </td>
                              </>
                            )}

                            <td className="px-4 py-4">
                              <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium">
                                {String(row.status ?? "unknown")
                                  .replaceAll("_", " ")
                                  .replaceAll("-", " ")}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </section>
    );
  }
