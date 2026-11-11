
import TrackingClient from "./TrackingClient";

export const instant = false;

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function TrackingPage({ params }: PageProps) {
  const { token } = await params;

  return <TrackingClient token={token} />;
}
