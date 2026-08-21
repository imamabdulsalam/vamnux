import fs from "node:fs";

const source = fs.readFileSync("client/src/pages/SuperAdmin.tsx", "utf8");
const registeredTabs = [...source.matchAll(/\{ id: "([^"]+)", label:/g)].map((match) => match[1]);
const dispatchedTabs = [...source.matchAll(/activeTab === "([^"]+)"/g)].map((match) => match[1]);
if (source.includes(": renderOverview();")) dispatchedTabs.push("overview");
const missing = registeredTabs.filter((tab) => !dispatchedTabs.includes(tab));
const extra = dispatchedTabs.filter((tab) => !registeredTabs.includes(tab));

console.log(JSON.stringify({ registeredTabs: registeredTabs.length, dispatchedTabs: dispatchedTabs.length, missing, extra }, null, 2));

if (missing.length || extra.length) process.exitCode = 1;
