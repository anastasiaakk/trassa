#!/usr/bin/env node
/**
 * Replace minified bundle symbols left in recovered AdminDashboard.tsx.
 */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "../src/pages/AdminDashboard.tsx");
let src = fs.readFileSync(file, "utf8");

src = src.replace(
  /import \{ Fragment, jsx, jsxs,/,
  'import { Fragment, jsx, jsxs } from "react/jsx-runtime";\nimport {',
);
src = src.replace(
  / from "react\/jsx-runtime";\nimport \{ type FormEvent, useCallback, useEffect, useMemo, useState \} from "react";/,
  ' type FormEvent, useCallback, useEffect, useMemo, useState } from "react";',
);

if (!src.includes('from "react/jsx-runtime"')) {
  src = src.replace(
    'import { Fragment, jsx, jsxs, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";',
    'import { Fragment, jsx, jsxs } from "react/jsx-runtime";\nimport { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";',
  );
}

const importBlock = `import {
  clearLocalClientEvents,
  listLocalClientEvents,
  listLocalClientEventTimes,
} from "../utils/clientDiagnostics";
`;

if (!src.includes("clientDiagnostics")) {
  src = src.replace(
    'import { fetchWithTimeout } from "../api/fetchWithTimeout";',
    `${importBlock}import { fetchWithTimeout } from "../api/fetchWithTimeout";`,
  );
}

const pairs = [
  [/\bqa\b/g, "TRASSA_SETUP_DOWNLOAD_URL"],
  [/\bXa\b/g, "SUBJECT_MARKERS_GEO"],
  [/\bnt\(\)/g, "listLocalClientEventTimes()"],
  [/\b\$t\(/g, "listLocalClientEvents("],
  [/\bTa\(\)/g, "isLegacyLoginAllowed()"],
  [/\bQt\(\)/g, "authListUsers()"],
  [/\bFa\(\)/g, "clearLocalClientEvents()"],
  [/\bPt\(/g, "saveMaintenanceState("],
  [/\bVa\(/g, "setUiSoundsEnabled("],
  [/\bKa\(\)/g, "migrateLocalPortalStateToServer()"],
  [/\bQa\(/g, "updateAdminPassword("],
  [/\ben\(/g, "saveMapCategoryLabels("],
  [/\bsn\(/g, "addMapSubjectOrganization("],
  [/\btn\(/g, "updateMapSubjectOrganization("],
  [/\ban\(/g, "removeMapSubjectOrganization("],
  [/\bnn\(\)/g, "logoutAdmin()"],
  [/\brn\(/g, "addContractorOrganization("],
  [/\bon\(/g, "removeContractorOrganization("],
  [/\bka\(/g, "validatePasswordPolicy("],
  [/\bwa\(/g, "resetPasswordForEmail("],
  [/\bLs\(/g, "formatSubjectDisplayName("],
  [/\bGe\b/g, "markNavigationFromAdminDashboard"],
  [/\bAt\b/g, "PASSWORD_RULES_SHORT"],
];

for (const [pat, repl] of pairs) {
  src = src.replace(pat, repl);
}

fs.writeFileSync(file, src);
console.log("Fixed AdminDashboard symbols");
