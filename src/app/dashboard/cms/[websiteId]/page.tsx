import { redirect } from "next/navigation";

/* CMS connections are coming soon; old links land on the overview page. */
export default function CMSConnectPage() {
  redirect("/dashboard/cms");
}
