
"use client";

import { useCallback, useEffect, useState } from "react";

import { getClinicQueueData } from "../actions";

import type { QueueStatus } from "../types";

type QueueData = Awaited<ReturnType<typeof getClinicQueueData>>;

type UseQueueProps = {
  clinicId: string;
  initialData: QueueData;
};

export default function useQueue({
  clinicId,
  initialData,
}: UseQueueProps) {
  const [queueData, setQueueData] = useState<QueueData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const updatedData = await getClinicQueueData(clinicId);
      setQueueData(updatedData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh queue data."
      );
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    setQueueData(initialData);
  }, [initialData]);

  return {
    queueData,
    loading,
    error,
    refreshQueue,
  };
}
