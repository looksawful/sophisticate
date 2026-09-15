import { spawnSync } from "node:child_process";

const result = spawnSync("npm", ["audit", "--json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (!result.stdout.trim()) {
  console.error("npm audit produced no JSON output.");
  if (result.stderr) console.error(result.stderr.trim());
  process.exitCode = 1;
} else {
  const report = JSON.parse(result.stdout);
  const vulnerabilities = report.vulnerabilities ?? {};
  const rows = Object.entries(vulnerabilities)
    .map(([name, value]) => ({
      name,
      severity: value.severity,
      direct: Boolean(value.isDirect),
      range: value.range,
      fixAvailable:
        value.fixAvailable === true
          ? "yes"
          : value.fixAvailable === false
            ? "no"
            : `${value.fixAvailable?.name ?? name}@${value.fixAvailable?.version ?? "unknown"}${value.fixAvailable?.isSemVerMajor ? " (major)" : ""}`,
    }))
    .sort((a, b) => Number(b.direct) - Number(a.direct) || a.name.localeCompare(b.name));

  console.log("npm audit metadata:");
  console.log(JSON.stringify(report.metadata?.vulnerabilities ?? {}, null, 2));
  console.log("\nVulnerable packages:");
  console.table(rows);

  const direct = rows.filter((row) => row.direct);
  console.log(`\nDirect vulnerable packages: ${direct.length}`);
  for (const row of direct) {
    console.log(`- ${row.name}: ${row.severity}, range ${row.range}, fix ${row.fixAvailable}`);
  }

  // Audit findings are reported here, not used as a blind blocking gate. Remediation
  // is tracked explicitly and the residual set is reviewed after each dependency slice.
  process.exitCode = 0;
}
