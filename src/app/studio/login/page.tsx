import { redirect } from "next/navigation";

import { getStudioConfigStatus } from "@/studio/config";
import { isAdminRequest } from "@/studio/auth";
import { logoutAction } from "@/studio/actions";
import { LoginForm } from "@/studio/ui/LoginForm";
import { SetupRequired } from "@/studio/ui/SetupRequired";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function StudioLogin({ searchParams }: { searchParams: Promise<{ logout?: string }> }) {
  const failedLogout = (await searchParams).logout === "failed";
  if (failedLogout) return <>
    <h1 className={styles.heading}>Sign-out not confirmed</h1>
    <p className={styles.error} role="alert">The session could not be revoked. It may still be valid when the database recovers. Retry sign-out; do not treat this device as signed out. For urgent revocation, rotate the administrator credential on all deployments.</p>
    <form action={logoutAction}><button className={styles.button} type="submit">Retry sign out</button></form>
  </>;
  if (await isAdminRequest()) redirect("/studio");
  const config = getStudioConfigStatus();

  return (
    <>
      <h1 className={styles.heading}>Sign in</h1>
      <p className={styles.lead}>Restricted to the site administrator.</p>
      {config.ready ? <LoginForm /> : <SetupRequired missing={config.missing} />}
    </>
  );
}
