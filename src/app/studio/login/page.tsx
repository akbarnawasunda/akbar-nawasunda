import { redirect } from "next/navigation";

import { getStudioConfigStatus } from "@/studio/config";
import { isAdminRequest } from "@/studio/auth";
import { LoginForm } from "@/studio/ui/LoginForm";
import { SetupRequired } from "@/studio/ui/SetupRequired";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Masuk" };

export default async function StudioLogin() {
  if (await isAdminRequest()) redirect("/studio");
  const config = getStudioConfigStatus();

  return (
    <>
      <h1 className={styles.heading}>Masuk</h1>
      <p className={styles.lead}>Hanya untuk administrator situs.</p>
      {config.ready ? <LoginForm /> : <SetupRequired missing={config.missing} />}
    </>
  );
}
