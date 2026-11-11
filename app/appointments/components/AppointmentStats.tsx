
"use client";

// Displays summary statistics for the appointments dashboard.

type AppointmentStatsProps = {
  totalAppointments: number;
  totalPatients: number;
  peakHour: string;
};

export default function AppointmentStats({
  totalAppointments,
  totalPatients,
  peakHour,
}: AppointmentStatsProps) {
  const stats = [
    {
      title: "Total Appointments",
      value: totalAppointments,
    },
    {
      title: "Active Patients",
      value: totalPatients,
    },
    {
      title: "Peak Appointment Hour",
      value: peakHour,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
        >
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {stat.title}
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
