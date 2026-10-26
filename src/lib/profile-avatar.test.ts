import { describe, expect, it } from "vitest";

import {
  AVATAR_LARGE_ERROR,
  AVATAR_MAX_BYTES,
  AVATAR_MISSING_ERROR,
  AVATAR_REMOVED_NOTICE,
  AVATAR_SAVED_NOTICE,
  AVATAR_TYPE_ERROR,
  AVATAR_UNAVAILABLE_ERROR,
  avatarPageError,
  avatarPageNotice,
  avatarPublicUrl,
  parseAvatarFile,
  sniffAvatarType,
} from "@/lib/profile-avatar";

const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_BYTES = [0xff, 0xd8, 0xff, 0xe0];
const WEBP_BYTES = [0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];
const GIF_BYTES = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];

function fileOfSize(size: number, type: string, name = "avatar"): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("parseAvatarFile", () => {
  it("accepts exactly 2 MB", () => {
    const file = fileOfSize(AVATAR_MAX_BYTES, "image/png");
    expect(parseAvatarFile(file)).toEqual({ ok: true, file, extension: "png" });
  });

  it("rejects 2 MB plus one byte", () => {
    expect(parseAvatarFile(fileOfSize(AVATAR_MAX_BYTES + 1, "image/png"))).toEqual({
      ok: false,
      code: "avatar-large",
      error: AVATAR_LARGE_ERROR,
    });
  });

  it("rejects an empty file", () => {
    expect(parseAvatarFile(fileOfSize(0, "image/png"))).toEqual({
      ok: false,
      code: "avatar-missing",
      error: AVATAR_MISSING_ERROR,
    });
  });

  it("rejects a missing file", () => {
    expect(parseAvatarFile(null)).toEqual({ ok: false, code: "avatar-missing", error: AVATAR_MISSING_ERROR });
    expect(parseAvatarFile("avatar.png")).toEqual({ ok: false, code: "avatar-missing", error: AVATAR_MISSING_ERROR });
  });

  it("maps each accepted type to its extension", () => {
    expect(parseAvatarFile(fileOfSize(10, "image/png"))).toMatchObject({ ok: true, extension: "png" });
    expect(parseAvatarFile(fileOfSize(10, "image/jpeg"))).toMatchObject({ ok: true, extension: "jpg" });
    expect(parseAvatarFile(fileOfSize(10, "image/webp"))).toMatchObject({ ok: true, extension: "webp" });
  });

  it("rejects GIF and SVG", () => {
    for (const type of ["image/gif", "image/svg+xml"]) {
      expect(parseAvatarFile(fileOfSize(10, type))).toEqual({
        ok: false,
        code: "avatar-type",
        error: AVATAR_TYPE_ERROR,
      });
    }
  });
});

describe("sniffAvatarType", () => {
  it("recognises PNG, JPEG and WebP", () => {
    expect(sniffAvatarType(new Uint8Array(PNG_BYTES))).toBe("image/png");
    expect(sniffAvatarType(new Uint8Array(JPEG_BYTES))).toBe("image/jpeg");
    expect(sniffAvatarType(new Uint8Array(WEBP_BYTES))).toBe("image/webp");
  });

  it("returns null for GIF, SVG, text and empty bytes", () => {
    expect(sniffAvatarType(new Uint8Array(GIF_BYTES))).toBeNull();
    expect(sniffAvatarType(new TextEncoder().encode("<svg xmlns"))).toBeNull();
    expect(sniffAvatarType(new TextEncoder().encode("not an image"))).toBeNull();
    expect(sniffAvatarType(new Uint8Array())).toBeNull();
  });

  it("rejects a RIFF file that is not WebP", () => {
    const wave = [...WEBP_BYTES.slice(0, 8), 0x57, 0x41, 0x56, 0x45];
    expect(sniffAvatarType(new Uint8Array(wave))).toBeNull();
  });

  it("finds a PNG declared as JPEG", () => {
    const file = new File([new Uint8Array(PNG_BYTES)], "avatar.jpg", { type: "image/jpeg" });
    const parsed = parseAvatarFile(file);
    expect(parsed.ok).toBe(true);
    expect(sniffAvatarType(new Uint8Array(PNG_BYTES))).not.toBe(file.type);
  });
});

describe("avatarPageError", () => {
  it("maps each error code to its copy", () => {
    expect(avatarPageError("avatar-missing")).toBe(AVATAR_MISSING_ERROR);
    expect(avatarPageError("avatar-type")).toBe(AVATAR_TYPE_ERROR);
    expect(avatarPageError("avatar-large")).toBe(AVATAR_LARGE_ERROR);
    expect(avatarPageError("avatar-unavailable")).toBe(AVATAR_UNAVAILABLE_ERROR);
  });

  it("ignores unknown and missing codes", () => {
    expect(avatarPageError("profile-unavailable")).toBeNull();
    expect(avatarPageError("toString")).toBeNull();
    expect(avatarPageError(null)).toBeNull();
  });
});

describe("avatarPageNotice", () => {
  it("maps both notices", () => {
    expect(avatarPageNotice("avatar-saved")).toBe(AVATAR_SAVED_NOTICE);
    expect(avatarPageNotice("avatar-removed")).toBe(AVATAR_REMOVED_NOTICE);
  });

  it("ignores unknown and missing codes", () => {
    expect(avatarPageNotice("profile-saved")).toBeNull();
    expect(avatarPageNotice(null)).toBeNull();
  });
});

describe("avatarPublicUrl", () => {
  it("builds the public bucket URL", () => {
    expect(avatarPublicUrl("http://127.0.0.1:54321", "user-1/abc.png")).toBe(
      "http://127.0.0.1:54321/storage/v1/object/public/avatars/user-1/abc.png",
    );
  });

  it("returns null without a path", () => {
    expect(avatarPublicUrl("http://127.0.0.1:54321", null)).toBeNull();
  });
});
