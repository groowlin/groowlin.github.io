#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v7 as uuidv7 } from "uuid";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, "..");
const casesDir = path.join(root, "content", "cases");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

function readCaseFiles() {
  const filenames = fs
    .readdirSync(casesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  return filenames.map((filename) => {
    const fullPath = path.join(casesDir, filename);
    const json = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    return json;
  });
}

async function upsertCase(casePayload) {
  const { data: existing, error: existingError } = await supabase
    .from("cms_cases")
    .select("id")
    .eq("slug", casePayload.slug)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check case ${casePayload.slug}: ${existingError.message}`);
  }

  const rowId = existing?.id ?? uuidv7();

  const caseUpdate = await supabase.from("cms_cases").upsert(
    {
      id: rowId,
      slug: casePayload.slug,
      draft_payload: casePayload,
      published_payload: casePayload.status === "published" ? casePayload : null,
      is_published: casePayload.status === "published",
      published_at: casePayload.status === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "slug" }
  );

  if (caseUpdate.error) {
    throw new Error(`Failed to upsert case ${casePayload.slug}: ${caseUpdate.error.message}`);
  }

  const orderUpdate = await supabase.from("cms_case_order").upsert(
    {
      case_id: rowId,
      draft_sort_order: casePayload.sortOrder,
      published_sort_order: casePayload.status === "published" ? casePayload.sortOrder : null
    },
    { onConflict: "case_id" }
  );

  if (orderUpdate.error) {
    throw new Error(`Failed to upsert case order ${casePayload.slug}: ${orderUpdate.error.message}`);
  }
}

async function upsertHeader() {
  const payload = {
    id: "site",
    name: "Gavin Nelson",
    role_prefix: "designer at",
    role_company_label: "OpenAI",
    role_company_href: "https://openai.com",
    logo_alt: "Gavin Nelson",
    meta_nav: [
      { label: "About", href: "/about", section: "meta" },
      { label: "Connect", href: "/connect", section: "meta" }
    ]
  };

  const { error } = await supabase.from("cms_site_header").upsert(payload, { onConflict: "id" });
  if (error) {
    throw new Error(`Failed to upsert site header: ${error.message}`);
  }
}

async function upsertStaticPages() {
  const about = {
    key: "about",
    meta: {
      title: "About",
      description: "About profile page for the Nelson-inspired portfolio clone.",
      canonical: "/about"
    },
    content_blocks: [
      {
        type: "paragraph",
        body: "Product and interaction designer focused on visual systems, motion language, and expressive yet clear user interfaces."
      },
      {
        type: "paragraph",
        body: "This clone preserves the editorial rhythm and interaction model of the original site while using placeholder media assets for phase 1 delivery."
      },
      {
        type: "links",
        items: [{ label: "Connect", href: "/connect" }]
      }
    ]
  };

  const connect = {
    key: "connect",
    meta: {
      title: "Connect",
      description: "Contact and profile links for the portfolio clone.",
      canonical: "/connect"
    },
    content_blocks: [
      {
        type: "links",
        items: [
          { label: "Email", href: "#" },
          { label: "Twitter", href: "#" },
          { label: "GitHub", href: "#" },
          { label: "LinkedIn", href: "#" }
        ]
      }
    ]
  };

  const { error: aboutError } = await supabase.from("cms_static_pages").upsert(about, { onConflict: "key" });
  if (aboutError) {
    throw new Error(`Failed to upsert about page: ${aboutError.message}`);
  }

  const { error: connectError } = await supabase.from("cms_static_pages").upsert(connect, { onConflict: "key" });
  if (connectError) {
    throw new Error(`Failed to upsert connect page: ${connectError.message}`);
  }
}

async function run() {
  const cases = readCaseFiles();
  for (const casePayload of cases) {
    await upsertCase(casePayload);
  }

  await upsertHeader();
  await upsertStaticPages();

  console.log(`Migrated ${cases.length} cases and static content to CMS tables.`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
