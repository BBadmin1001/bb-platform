import { redirect } from "next/navigation";

/**
 * Root URL is just a redirect to the sign-in page. The platform is a
 * lead-CRM behind /master and /sales — anyone landing at the bare
 * domain is either a super admin or a rep, so we send them to /admin
 * which auto-routes them to the right dashboard once they're signed in.
 */
export default function RootPage() {
  redirect("/admin");
}
