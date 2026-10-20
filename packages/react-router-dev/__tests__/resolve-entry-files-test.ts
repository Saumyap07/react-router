import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ResolvedReactRouterConfig } from "../config/config";

let execSync = jest.fn();

(jest as any).unstable_mockModule("node:child_process", () => ({
  execSync,
}));

let { resolveEntryFiles } = await import("../config/config");

describe("resolveEntryFiles", () => {
  let tmpDir: string;

  beforeEach(() => {
    execSync.mockClear();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rr-entry-files-test-"));
    fs.mkdirSync(path.join(tmpDir, "app"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  let getConfig = (
    ssr: ResolvedReactRouterConfig["ssr"],
  ): ResolvedReactRouterConfig =>
    ({
      appDirectory: path.join(tmpDir, "app"),
      ssr,
      future: {
        unstable_enableNodeReadableStream: false,
      },
    }) as ResolvedReactRouterConfig;

  it("does not add isbot when SSR is disabled", async () => {
    let packageJsonPath = path.join(tmpDir, "package.json");
    fs.writeFileSync(packageJsonPath, JSON.stringify({}));

    await resolveEntryFiles({
      rootDirectory: tmpDir,
      reactRouterConfig: getConfig(false),
    });

    expect(JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))).toEqual({});
    expect(execSync).not.toHaveBeenCalled();
  });

  it("adds isbot for SSR-enabled projects without installing packages", async () => {
    let packageJsonPath = path.join(tmpDir, "package.json");
    fs.writeFileSync(packageJsonPath, JSON.stringify({}));

    await resolveEntryFiles({
      rootDirectory: tmpDir,
      reactRouterConfig: getConfig(true),
    });

    expect(JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))).toEqual({
      dependencies: { isbot: "^5" },
    });
    expect(execSync).toHaveBeenCalledWith(
      expect.stringMatching(/ install$/),
      expect.objectContaining({
        cwd: tmpDir.replaceAll(path.sep, "/"),
        stdio: "inherit",
      }),
    );
  });
});
