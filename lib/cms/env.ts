export function isCmsDbEnabled() {
  return process.env.CMS_DB_ENABLED === "true";
}

export function isCmsReadFromDbEnabled() {
  const explicitValue = process.env.CMS_DB_READ_ENABLED;
  if (explicitValue === undefined) {
    return isCmsDbEnabled();
  }
  return explicitValue === "true";
}

export function assertCmsEnabled() {
  if (!isCmsDbEnabled()) {
    throw new Error("CMS_DB_ENABLED is false. Enable CMS_DB_ENABLED to use CMS APIs.");
  }
}

export function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getStorageBucketName() {
  return process.env.SUPABASE_STORAGE_BUCKET ?? "portfolio-media";
}
