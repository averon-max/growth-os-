import { redirect } from "next/navigation";

/** Old address: support tickets now live in the admin inbox. */
export default function OldTickets() {
  redirect("/dashboard/admin/inbox?kind=ticket");
}
