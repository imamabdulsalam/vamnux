import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { ENV } from "./_core/env";

function normalizeKey(relKey: string): string {
  const key = relKey.replace(/^\/+/, "");
  if (!key || key.includes("..") || !/^[a-zA-Z0-9._/-]+$/.test(key)) {
    throw new Error("Invalid local storage key");
  }
  return key;
}

function appendHashSuffix(relKey: string): string {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export function getLocalStorageDirectory() {
  return ENV.localUploadDir || path.resolve(process.cwd(), "uploads");
}

function localStoragePath(key: string) {
  const root = path.resolve(getLocalStorageDirectory());
  const destination = path.resolve(root, key);
  if (destination !== root && !destination.startsWith(`${root}${path.sep}`)) throw new Error("Invalid local storage path");
  return destination;
}

function localMediaUrl(key: string) {
  return `/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function ensureLocalStorageDirectory() {
  await mkdir(getLocalStorageDirectory(), { recursive: true });
}

/** Store public owner-managed catalog imagery on the Namecheap application filesystem. */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const target = localStoragePath(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  void contentType;
  return { key, url: localMediaUrl(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: localMediaUrl(key) };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return localMediaUrl(key);
}
