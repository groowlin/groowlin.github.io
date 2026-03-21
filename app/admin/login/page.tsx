import type { Metadata } from "next";
import { signIn } from "@/auth";
import styles from "@/app/admin/admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

async function signInAction() {
  "use server";
  await signIn("github", { redirectTo: "/admin" });
}

export default function AdminLoginPage() {
  return (
    <main className={styles.adminRoot}>
      <section className={styles.loginCard}>
        <h1 className={styles.loginTitle}>Вход в CMS</h1>
        <p className={styles.loginText}>Доступ разрешен только автору сайта через GitHub OAuth.</p>
        <form action={signInAction}>
          <button type="submit" className={styles.primaryButton}>
            Войти через GitHub
          </button>
        </form>
      </section>
    </main>
  );
}
