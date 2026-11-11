
"use client";

import { QRCodeSVG } from "qrcode.react";

type Props = {
  bookingCode: string;
  enabled: boolean;
};

export default function PublicBookingSettings({
  bookingCode,
  enabled,
}: Props) {
  const bookingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/book/${bookingCode}`
      : `https://www.samayq.in/book/${bookingCode}`;

  async function copyLink() {
    await navigator.clipboard.writeText(bookingUrl);
    alert("Booking link copied.");
  }

  return (
    <section className="rounded-xl border bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold">Public appointment booking</h2>
        <p className="mt-1 text-sm text-gray-500">
          Share this link or QR code with patients so they can book
          appointments online.
        </p>
      </div>

      <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="rounded-xl border bg-white p-3">
          <QRCodeSVG value={bookingUrl} size={180} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Booking link</p>

          <p className="mt-2 break-all rounded-lg bg-gray-50 p-3 text-sm">
            {bookingUrl}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Copy link
            </button>

            <a
              href={bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border px-4 py-2 text-sm font-medium"
            >
              Open booking page
            </a>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Booking status: {enabled ? "Enabled" : "Disabled"}
          </p>
        </div>
      </div>
    </section>
  );
}
