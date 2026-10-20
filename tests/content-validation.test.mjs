import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import matter from "gray-matter";
import { classifyContentFile, validateFrontmatter } from "../scripts/content-validation.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

for (const [platform, pathApi, checkout] of [
  ["POSIX", path.posix, "/home/runner/work/pages/portfolio"],
  ["Windows", path.win32, "C:\\runner\\work\\pages\\portfolio"]
]) {
  test(`${platform}: only content-relative directory determines content type`, () => {
    const contentRoot = pathApi.join(checkout, "content");
    for (const [file, expected] of [
      [["work", "sample.mdx"], { type: "work", slug: "sample" }],
      [["pages", "about.mdx"], { type: "pages", slug: "about" }],
      [["site", "home.mdx"], { type: "site", slug: "home" }],
      [["site", "work", "nested.mdx"], { type: "site", slug: "nested" }],
      [["other", "work", "nested.mdx"], null]
    ]) {
      assert.deepEqual(classifyContentFile(contentRoot, pathApi.join(contentRoot, ...file), pathApi), expected);
    }
    assert.equal(classifyContentFile(contentRoot, pathApi.join(contentRoot, "work", "notes.txt"), pathApi), null);
  });

  test(`${platform}: paths outside content cannot become cases`, () => {
    const contentRoot = pathApi.join(checkout, "content");
    for (const file of [
      contentRoot,
      pathApi.join(contentRoot, "..", "work", "outside.mdx"),
      pathApi.join(checkout, "content-other", "work", "outside.mdx"),
      pathApi.join(contentRoot, "work", "..", "..", "outside.mdx")
    ]) assert.equal(classifyContentFile(contentRoot, file, pathApi), null);
    if (platform === "Windows") {
      assert.equal(classifyContentFile(contentRoot, "D:\\content\\work\\outside.mdx", pathApi), null);
    }
  });
}

test("work and pages have distinct frontmatter checks", () => {
  const page = { title: "About", description: "Profile", canonical: "/about" };
  assert.deepEqual(validateFrontmatter({ type: "pages", slug: "about" }, page), { errors: [], warnings: [] });
  assert.equal(validateFrontmatter({ type: "pages", slug: "about" }, {}).errors.length, 3);
  const work = { ...page, slug: "sample", canonical: "/work/sample/", subtitle: "2026 · Design" };
  assert.deepEqual(validateFrontmatter({ type: "work", slug: "sample" }, work), { errors: [], warnings: [] });
  const invalid = validateFrontmatter({ type: "work", slug: "sample" }, { ...work, slug: "wrong", canonical: "/about", title: " " });
  assert.equal(invalid.errors.length, 3);
  assert.ok(invalid.errors.some((message) => message.includes("must match filename")));
  assert.ok(invalid.errors.some((message) => message.includes("canonical must be '/work/sample'")));
  assert.equal(validateFrontmatter({ type: "work", slug: "sample" }, { ...work, subtitle: "Design" }).warnings.length, 1);
});

test("actual site configurations do not receive page or work requirements", async () => {
  for (const name of ["home", "link-preview", "top-card-default", "top-card-to-home", "top-card-to-profile"]) {
    const file = path.join(repositoryRoot, "content", "site", `${name}.mdx`);
    const data = matter(await fs.readFile(file, "utf8")).data;
    assert.deepEqual(validateFrontmatter(classifyContentFile(path.join(repositoryRoot, "content"), file), data), { errors: [], warnings: [] }, name);
  }
});

test("CLI validates checkout under work/pages ancestors and rejects invalid cases and false work links", async () => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "content-validation-"));
  try {
    const fixtureRoot = path.join(temporaryRoot, "work", "pages", "portfolio");
    for (const directory of ["work", "pages", "site/work"]) {
      await fs.mkdir(path.join(fixtureRoot, "content", directory), { recursive: true });
    }
    const writeContent = (name, value) => fs.writeFile(path.join(fixtureRoot, "content", name), value);
    await Promise.all([
      writeContent("work/sample.mdx", '---\nslug: sample\ntitle: Sample\ndescription: Case\ncanonical: /work/sample\nsubtitle: "2026 · Design"\n---\n'),
      writeContent("pages/about.mdx", "---\ntitle: About\ndescription: Profile\ncanonical: /about\n---\n[Case](/work/sample)\n"),
      writeContent("site/home.mdx", "---\ntitle: Home\nseo:\n  siteUrl: https://example.com\n  siteName: Portfolio\n  defaultTitle: Portfolio\n  defaultDescription: Design\n---\n"),
      writeContent("site/link-preview.mdx", "---\ntitle: Preview\ndescription: Shared preview\nurl: https://example.com\n---\n"),
      writeContent("site/top-card-default.mdx", "---\ntitle: Top card\nsubtitle: Profile\nphoto: /photo.svg\nlink: /about\n---\n"),
      writeContent("site/work/phantom.mdx", "---\ntitle: Site configuration\n---\n"),
      fs.writeFile(path.join(fixtureRoot, "portfolio-structure.json"), "{}\n"),
      fs.writeFile(path.join(fixtureRoot, "portoflio-structure.json"), "{}\n")
    ]);
    const run = () => spawnSync(process.execPath, [path.join(repositoryRoot, "scripts", "content-validate.mjs")], { cwd: fixtureRoot, encoding: "utf8" });
    const valid = run();
    assert.equal(valid.status, 0, `${valid.stdout}\n${valid.stderr}`);
    assert.match(valid.stdout, /0 error\(s\), 0 warning\(s\)/);

    await writeContent("pages/about.mdx", "---\ntitle: About\ndescription: Profile\ncanonical: /about\n---\n[False case](/work/phantom)\n");
    const falseLink = run();
    assert.equal(falseLink.status, 1, falseLink.stderr);
    assert.match(falseLink.stderr, /unknown work slug 'phantom'/);

    await writeContent("work/sample.mdx", "---\nslug: wrong\ntitle: Sample\ndescription: Case\ncanonical: /about\n---\n");
    const invalid = run();
    assert.equal(invalid.status, 1, invalid.stderr);
    assert.match(invalid.stderr, /must match filename 'sample'/);
    assert.match(invalid.stderr, /canonical must be '\/work\/sample'/);
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});
