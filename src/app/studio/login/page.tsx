import { redirect } from "next/navigation";

import { getStudioConfigStatus } from "@/studio/config";
import { isAdminRequest } from "@/studio/auth";
import { LoginForm } from "@/studio/ui/LoginForm";
import { SetupRequired } from "@/studio/ui/SetupRequired";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function StudioLogin() {
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
