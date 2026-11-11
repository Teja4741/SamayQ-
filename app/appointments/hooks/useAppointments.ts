
"use client";

// Manages appointment data, receptionist booking, filters, and calendar state.

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";
import { createAppointment, cancelAppointment } from "../actions";

import type {
  Department,
  Doctor,
  Patient,
  Appointment,
  BookingMode,
  ViewMode,
} from "../utils/types";

import { formatDate, addDays } from "../utils/dateUtils";

export function useAppointments(clinicId: string) {
  const supabase = useMemo(() => createClient(), []);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("day");
  const [hourOffset, setHourOffset] = useState(0);
  const [singleHour, setSingleHour] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");

  const [assignmentId, setAssignmentId] = useState("");
  const [bookingDepartmentId, setBookingDepartmentId] = useState("");
  const [bookingMode, setBookingMode] = useState<BookingMode>("doctor");

  const [appointmentDate, setAppointmentDate] = useState(
    () => formatDate(new Date())
  );

  const [startTime, setStartTime] = useState("09:00");
  const [notes, setNotes] = useState("");

  // Load appointments, doctors, departments and patients.
  const loadData = useCallback(async () => {
    if (!clinicId) {
      setError("Clinic information is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [
        departmentResult,
        assignmentResult,
        patientResult,
        appointmentResult,
        clinicResult,
      ] = await Promise.all([
        // Departments
        supabase
          .from("departments")
          .select("id, name")
          .eq("clinic_id", clinicId)
          .eq("is_active", true)
          .order("name"),

        // Doctor clinic assignments
        supabase
          .from("doctor_clinic_assignments")
          .select(
            "id, doctor_id, department_id, consultation_duration_minutes"
          )
          .eq("clinic_id", clinicId)
          .eq("is_active", true),

        // Patients
        supabase
          .from("patients")
          .select("id, full_name, phone")
          .eq("clinic_id", clinicId)
          .order("full_name"),

        // Appointments
        supabase
          .from("appointments")
          .select(
            "id, patient_id, doctor_clinic_assignment_id, department_id, appointment_date, start_time, duration_minutes, status, booking_type, notes"
          )
          .eq("clinic_id", clinicId)
          // Show only today's and future appointments.
          // Past records remain stored for the History page.
          .gte("appointment_date", formatDate(new Date()))
          .order("appointment_date")
          .order("start_time"),

        // Authoritative clinic booking mode
        supabase
          .from("clinics")
          .select("booking_mode")
          .eq("id", clinicId)
          .maybeSingle(),
      ]);

      if (departmentResult.error) throw departmentResult.error;
      if (assignmentResult.error) throw assignmentResult.error;
      if (patientResult.error) throw patientResult.error;
      if (appointmentResult.error) throw appointmentResult.error;
      if (clinicResult.error) throw clinicResult.error;

      if (!clinicResult.data) {
        throw new Error("Clinic configuration was not found.");
      }

      // Resolve the clinic's booking mode.
      const resolvedBookingMode: BookingMode =
        clinicResult.data.booking_mode === "department"
          ? "department"
          : "doctor";

      setBookingMode(resolvedBookingMode);

      // Only doctor-wise clinics need doctor options.
      const assignments =
        resolvedBookingMode === "doctor"
          ? (assignmentResult.data ?? []).filter(
              (assignment) => assignment.department_id === null
            )
          : [];

      // Get doctor IDs from clinic assignments.
      const doctorIds = [
        ...new Set(assignments.map((item) => item.doctor_id)),
      ];

      // Load doctor records using their actual names.
      let doctorRecords: {
        id: string;
        full_name: string;
      }[] = [];

      if (doctorIds.length > 0) {
        const { data, error: doctorError } = await supabase
          .from("doctors")
          .select("id, full_name")
          .in("id", doctorIds)
          .eq("is_active", true);

        if (doctorError) throw doctorError;

        doctorRecords = data ?? [];
      }

      // Map doctor IDs to their names.
      const doctorNames = new Map(
        doctorRecords.map((doctor) => [
          doctor.id,
          doctor.full_name,
        ])
      );

      // Build doctor dropdown options.
      const doctorOptions: Doctor[] = assignments
        .filter((assignment) =>
          doctorNames.has(assignment.doctor_id)
        )
        .map((assignment) => ({
          id: assignment.id,
          doctorId: assignment.doctor_id,
          name:
            doctorNames.get(assignment.doctor_id) ||
            "Unnamed doctor",
          departmentId: assignment.department_id,
          duration:
            assignment.consultation_duration_minutes || 15,
        }));

      // Update page state.
      setDepartments(departmentResult.data ?? []);
      setDoctors(doctorOptions);
      setPatients(patientResult.data ?? []);
      setAppointments(appointmentResult.data ?? []);

      // Reset booking selections.
      setAssignmentId("");
      setBookingDepartmentId("");

    } catch (err) {
      console.error("Appointment data loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load appointment data."
      );
    } finally {
      setLoading(false);
    }
  }, [clinicId, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Search appointments.
  const filteredAppointments = useMemo(() => {
    if (!search.trim()) return appointments;

    const query = search.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const patient = patients.find(
        (item) => item.id === appointment.patient_id
      );

      const matchesPatient =
        patient?.full_name.toLowerCase().includes(query) ||
        patient?.phone?.toLowerCase().includes(query);

      const matchesAppointment = appointment.id
        .toLowerCase()
        .includes(query);

      return matchesPatient || matchesAppointment;
    });
  }, [appointments, patients, search]);

  // Filter appointments according to calendar view.
  const visibleAppointments = useMemo(
    () =>
      filteredAppointments.filter((appointment) => {
        if (view === "day") {
          return (
            appointment.appointment_date === formatDate(selectedDate)
          );
        }

        if (view === "week") {
          const start = new Date(selectedDate);
          start.setDate(start.getDate() - start.getDay());

          const end = addDays(start, 6);

          return (
            appointment.appointment_date >= formatDate(start) &&
            appointment.appointment_date <= formatDate(end)
          );
        }

        return (
          appointment.appointment_date.slice(0, 7) ===
          formatDate(selectedDate).slice(0, 7)
        );
      }),
    [filteredAppointments, selectedDate, view]
  );

  const activeAppointments = filteredAppointments.filter(
    (appointment) =>
      !["cancelled", "no_show"].includes(
        appointment.status.toLowerCase()
      )
  );

  const uniquePatients = new Set(
    activeAppointments.map((item) => item.patient_id)
  ).size;

  // Find peak appointment hour.
  const peakHour = (() => {
    const counts = new Map<number, number>();

    activeAppointments.forEach((appointment) => {
      const hour = Number(appointment.start_time.slice(0, 2));

      counts.set(hour, (counts.get(hour) ?? 0) + 1);
    });

    let bestHour = -1;
    let bestCount = 0;

    counts.forEach((count, hour) => {
      if (count > bestCount) {
        bestCount = count;
        bestHour = hour;
      }
    });

    return bestHour < 0
      ? "–"
      : `${String(bestHour).padStart(2, "0")}:00`;
  })();

  const dayAppointments = filteredAppointments.filter(
    (appointment) =>
      appointment.appointment_date === formatDate(selectedDate)
  );

  const currentHour = new Date().getHours() + hourOffset;

  const displayedAppointments = visibleAppointments.filter(
    (appointment) => {
      if (!singleHour || view !== "day") return true;

      return (
        Number(appointment.start_time.slice(0, 2)) === currentHour
      );
    }
  );

  // Change calendar date.
  function changeDate(direction: number) {
    const amount =
      view === "day" ? 1 : view === "week" ? 7 : 30;

    setSelectedDate((current) =>
      addDays(current, direction * amount)
    );
  }

  // Open appointment booking form.
  function openBooking() {
    setPatientName("");
    setPatientPhone("");
    setPatientAge("");
    setAssignmentId("");
    setBookingDepartmentId("");
    setAppointmentDate(formatDate(selectedDate));
    setStartTime("09:00");
    setNotes("");
    setNotice("");
    setModalOpen(true);
  }

  // Create appointment.
  async function handleCreateAppointment(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    if (!patientName.trim()) {
      setNotice("Please enter the patient's name.");
      return;
    }

    if (!patientPhone.trim()) {
      setNotice("Please enter the patient's phone number.");
      return;
    }

    if (
      patientAge.trim() &&
      (
        !Number.isInteger(Number(patientAge)) ||
        Number(patientAge) < 0 ||
        Number(patientAge) > 120
      )
    ) {
      setNotice("Please enter a valid age between 0 and 120.");
      return;
    }

    if (bookingMode === "doctor" && !assignmentId) {
      setNotice("Please select a doctor.");
      return;
    }

    if (
      bookingMode === "department" &&
      !bookingDepartmentId
    ) {
      setNotice("Please select a department.");
      return;
    }

    setSaving(true);
    setNotice("");

    try {
      const result = await createAppointment({
        clinicId,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientAge: patientAge.trim()
          ? Number(patientAge)
          : null,
        assignmentId:
          bookingMode === "doctor" ? assignmentId : undefined,
        departmentId:
          bookingMode === "department"
            ? bookingDepartmentId
            : undefined,
        appointmentDate,
        startTime,
        notes: notes.trim(),
      });

      setNotice(result.message);

      if (result.success) {
        setModalOpen(false);
        await loadData();
      }
    } catch (err) {
      setNotice(
        err instanceof Error
          ? err.message
          : "Unable to create appointment."
      );
    } finally {
      setSaving(false);
    }
  }

  // Cancel appointment.
  async function handleCancel(id: string) {
    if (!window.confirm("Cancel this appointment?")) return;

    const result = await cancelAppointment(id, clinicId);

    setNotice(result.message);

    if (result.success) {
      await loadData();
    }
  }

  const heading = selectedDate.toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return {
    departments,
    doctors,
    patients,
    appointments,
    loading,
    error,
    notice,

    search,
    setSearch,

    selectedDate,
    setSelectedDate,
    view,
    setView,
    hourOffset,
    setHourOffset,
    singleHour,
    setSingleHour,

    modalOpen,
    setModalOpen,
    saving,

    patientName,
    setPatientName,
    patientPhone,
    setPatientPhone,
    patientAge,
    setPatientAge,

    assignmentId,
    setAssignmentId,
    bookingDepartmentId,
    setBookingDepartmentId,
    bookingMode,

    appointmentDate,
    setAppointmentDate,
    startTime,
    setStartTime,
    notes,
    setNotes,

    filteredAppointments,
    visibleAppointments,
    activeAppointments,
    uniquePatients,
    peakHour,
    dayAppointments,
    displayedAppointments,

    changeDate,
    openBooking,
    handleCreateAppointment,
    handleCancel,
    heading,
    loadData,
  };
}
