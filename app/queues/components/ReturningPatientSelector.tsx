"use client";

export type QueueType = "walk_in" | "appointment";

type QueueTypeSelectorProps = {
  value: QueueType;
  onChange: (value: QueueType) => void;
};

export default function QueueTypeSelector({
  value,
  onChange,
}: QueueTypeSelectorProps) {
  const options: {
    id: QueueType;
    label: string;
    description: string;
  }[] = [
    {
      id: "walk_in",
      label: "Walk-in",
      description: "Register a patient directly",
    },
    {
      id: "appointment",
      label: "Reserved",
      description: "Select an existing appointment",
    },
  ];

  return (
    <div className="mb-5">
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Patient type
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={selected}
              className={`rounded-lg border px-4 py-3 text-left transition ${
                selected
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              }`}
            >
              <span className="block text-sm font-semibold">
                {option.label}
              </span>

              <span className="mt-1 block text-xs opacity-75">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}