import { redirect } from "next/navigation";

/** Old address: feedback now lives in the admin inbox. */
export default function OldFeedback() {
  redirect("/dashboard/admin/inbox?kind=feedback");
}
