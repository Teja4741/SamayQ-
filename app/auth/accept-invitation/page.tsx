
import { redirect } from "next/navigation";
import AcceptInvitationForm from "./AcceptInvitationForm";
export const instant = false;
type Props = {
  searchParams: Promise<{
    invitationId?: string;
  }>;
};

export default async function AcceptInvitationPage({
  searchParams,
}: Props) {
  const { invitationId } = await searchParams;

  if (!invitationId) {
    redirect("/auth/error?error=Missing%20invitation%20ID");
  }

  return (
    <AcceptInvitationForm invitationId={invitationId} />
  );
}
