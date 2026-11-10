import { redirect } from "next/navigation";

/** Старый адрес админки. Оставлен, чтобы сохранённые ссылки не упирались в 404. */
export default function AdminRedirect() {
  redirect("/dashboard/admin");
}
