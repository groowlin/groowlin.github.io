import { signOut } from "@/auth";
import { AdminConsole } from "@/components/admin/AdminConsole";
import styles from "@/app/admin/admin.module.css";
import { requireAdminSession } from "@/lib/cms/auth/require-admin.server";
import { isCmsDbEnabled } from "@/lib/cms/env";
import {
  getAdminCasesFromDb,
  getSiteHeaderFromDb,
  getStaticPageFromDb,
  listMediaAssetsFromDb
} from "@/lib/cms/db.server";
import { defaultSiteHeaderContent, staticPageContentDefaults } from "@/lib/content";

export const dynamic = "force-dynamic";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export default async function AdminPage() {
  await requireAdminSession();

  if (!isCmsDbEnabled()) {
    return (
      <main className={styles.adminRoot}>
        <section className={styles.loginCard}>
          <h1 className={styles.loginTitle}>CMS отключена</h1>
          <p className={styles.loginText}>Установите `CMS_DB_ENABLED=true` и настройте Supabase переменные окружения.</p>
        </section>
      </main>
    );
  }

  const [cases, headerFromDb, aboutFromDb, connectFromDb, media] = await Promise.all([
    getAdminCasesFromDb(),
    getSiteHeaderFromDb(),
    getStaticPageFromDb("about"),
    getStaticPageFromDb("connect"),
    listMediaAssetsFromDb()
  ]);

  return (
    <main className={styles.adminRoot}>
      <div className={styles.consoleWrap}>
        <div className={styles.consoleHeader}>
          <div className={styles.titleGroup}>
            <h1 className={styles.consoleTitle}>CMS</h1>
            <p className={styles.consoleSubtitle}>Управление контентом портфолио</p>
          </div>
          <form action={signOutAction}>
            <button className={styles.ghostButton} type="submit">
              Выйти
            </button>
          </form>
        </div>

        <AdminConsole
          initialData={{
            cases,
            header: headerFromDb ?? defaultSiteHeaderContent,
            about: aboutFromDb ?? staticPageContentDefaults.about,
            connect: connectFromDb ?? staticPageContentDefaults.connect,
            media
          }}
        />
      </div>
    </main>
  );
}
