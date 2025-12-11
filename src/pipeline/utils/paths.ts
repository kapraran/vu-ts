import type { typeNamespace } from "../interfaces";

export function resolveNamespace(filePath: string): typeNamespace {
  if (filePath.match(/VU-Docs-master\\types\\client/i)) return "client";
  if (filePath.match(/VU-Docs-master\\types\\server/i)) return "server";
  if (filePath.match(/VU-Docs-master\\types\\fb/i)) return "fb";
  return "shared";
}

export function resolveRelPath(filePath: string): string {
  return filePath.replace(/^.*\\VU-Docs-master\\types\\/i, "");
}
