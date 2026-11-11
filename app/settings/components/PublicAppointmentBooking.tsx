"use client";
//This is the new panel. It displays the selected clinic's unique QR 
// code and booking link, with copy, open, download, enable/disable, and 
// regenerate actions.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  regeneratePublicBookingCode,
  setPublicBookingEnabled,
} from "@/app/settings/public-booking-actions";

type Props = {
  clinicId: string;
  clinicName: string;
  initialCode: string | null;
  initialEnabled: boolean;
};

export default function PublicAppointmentBooking({
  clinicId,
  clinicName,
  initialCode,
  initialEnabled,
}: Props) {
  const router = useRouter();

  const [code, setCode] = useState(initialCode);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [origin, setOrigin] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setCode(initialCode);
    setEnabled(initialEnabled);
    setMessage("");
    setSuccess(null);
  }, [clinicId, initialCode, initialEnabled]);

  const bookingLink =
    origin && code ? `${origin}/book/${code}` : "";

  async function handleCopyLink() {
    if (!bookingLink) return;

    try {
      await navigator.clipboard.writeText(bookingLink);
      setMessage("Booking link copied successfully.");
      setSuccess(true);
    } catch {
      setMessage("Unable to copy the link. Please copy it manually.");
      setSuccess(false);
    }
  }

  function handleToggle() {
    const nextEnabled = !enabled;

    setMessage("");
    setSuccess(null);

    startTransition(async () => {
      const result = await setPublicBookingEnabled(
        clinicId,
        nextEnabled
      );

      if (!result.success) {
        setMessage(result.message);
        setSuccess(false);
        return;
      }

      setEnabled(Boolean(result.enabled));
      setCode(result.code ?? code);
      setMessage(result.message);
      setSuccess(true);
      router.refresh();
    });
  }

  function handleRegenerate() {
    const confirmed = window.confirm(
      `Generate a new public booking link for ${clinicName}?\n\nThe previous booking link will stop working. Existing appointments and patient records will not be deleted.`
    );

    if (!confirmed) return;

    setMessage("");
    setSuccess(null);

    startTransition(async () => {
      const result = await regeneratePublicBookingCode(clinicId);

      if (!result.success) {
        setMessage(result.message);
        setSuccess(false);
        return;
      }

      setCode(result.code ?? null);
      setEnabled(Boolean(result.enabled));
      setMessage(result.message);
      setSuccess(true);
      router.refresh();
    });
  }

  async function handleDownloadPng() {
    const svg = document.getElementById(
      `public-booking-qr-${clinicId}`
    );

    if (!(svg instanceof SVGElement)) {
      setMessage("QR code is not ready yet.");
      setSuccess(false);
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);

      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 1024;

        const context = canvas.getContext("2d");

        if (!context) {
          URL.revokeObjectURL(svgUrl);
          setMessage("Unable to create QR image.");
          setSuccess(false);
          return;
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, 1024, 1024);
        context.drawImage(image, 0, 0, 1024, 1024);

        URL.revokeObjectURL(svgUrl);

        const downloadLink = document.createElement("a");
        downloadLink.download = `${clinicName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}-appointment-qr.png`;

        downloadLink.href = canvas.toDataURL("image/png");
        downloadLink.click();

        setMessage("QR code downloaded.");
        setSuccess(true);
      };

      image.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        setMessage("Unable to download QR code.");
        setSuccess(false);
      };

      image.src = svgUrl;
    } catch {
      setMessage("Unable to download QR code.");
      setSuccess(false);
    }
  }

  return (
    <div className="border-t border-[#edf0f6] pt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">
            Public Appointment Booking
          </h3>
          <p className="mt-1 text-sm text-[#68758d]">
            Let patients book appointments for {clinicName} by
            scanning this clinic's unique QR code.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Enable public appointment booking"
          onClick={handleToggle}
          disabled={isPending}
          className={`relative h-8 w-14 rounded-full transition ${
            enabled ? "bg-[#6557ff]" : "bg-gray-300"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
              enabled ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      {code && bookingLink ? (
        <div className="mt-6 grid gap-6 md:grid-cols-[242px_1fr]">
          <div className="flex items-center justify-center rounded-xl border border-[#dfe3ed] bg-white p-4">
            <QRCodeSVG
              id={`public-booking-qr-${clinicId}`}
              value={bookingLink}
              size={210}
              level="H"
              includeMargin
            />
          </div>

          <div className="min-w-0">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                enabled
                  ? "bg-[#eeeaff] text-[#6557ff]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {enabled ? "Live" : "Disabled"}
            </span>

            <div className="mt-4 break-all rounded-xl bg-[#f3f4f8] px-4 py-3 text-sm text-[#536581]">
              {bookingLink}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!enabled}
                className="rounded-lg border border-[#dfe3ed] px-4 py-2.5 text-sm font-medium hover:bg-[#f8f9ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Copy link
              </button>

              <button
                type="button"
                onClick={() => window.open(bookingLink, "_blank", "noopener,noreferrer")}
                disabled={!enabled}
                className="rounded-lg border border-[#dfe3ed] px-4 py-2.5 text-sm font-medium hover:bg-[#f8f9ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Open booking page
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                className="rounded-lg border border-[#dfe3ed] px-4 py-2.5 text-sm font-medium hover:bg-[#f8f9ff]"
              >
                Download QR (1024px)
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[#d8ddec] bg-[#fafbff] p-5 text-sm text-[#68758d]">
          This clinic does not have a booking code yet. Enable
          public booking to generate its unique link and QR code.
        </div>
      )}

      <div className="mt-6 border-t border-[#edf0f6] pt-5">
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={isPending}
          className="flex items-center gap-2 text-sm font-medium text-[#68758d] hover:text-[#6557ff] disabled:opacity-50"
        >
          <span className="text-lg">↻</span>
          {isPending ? "Please wait..." : "Generate a new code"}
        </button>

        <p className="mt-2 text-sm text-[#68758d]">
          Use this if the booking link has been shared incorrectly
          or misused. The previous link will stop working.
        </p>
      </div>

      {message && (
        <p
          className={`mt-4 text-sm ${
            success ? "text-emerald-700" : "text-red-600"
          }`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}