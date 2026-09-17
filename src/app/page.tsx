import { redirect } from "next/navigation"

/** No landing page: signed-out visitors are sent to /login by the proxy. */
export default function HomePage() {
  redirect("/dashboard")
}
