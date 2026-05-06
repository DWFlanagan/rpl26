import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadProjectSnapshot, readProjectFile, writeProjectFile } from "../src/integration/project.js";

describe("integration project persistence", () => {
  it("validates a project snapshot with annotated sources", () => {
    const result = loadProjectSnapshot({
      format: "rpl26-project",
      version: 1,
      snapshot: { format: "rpl26-session", version: 1, stack: [], variables: {} },
      sources: {
        VELOCITY: {
          name: "VELOCITY",
          source: "<< @ Stack: distance time -> velocity\n * >>",
          installedHash: "abc",
          updatedAt: "2026-05-06T00:00:00.000Z",
          examples: [
            {
              description: "multiplies two reals",
              input: "3 4 VELOCITY",
              expectedStack: [{ kind: "real", value: 12 }]
            }
          ]
        }
      }
    });

    expect(result).toMatchObject({ ok: true });
  });

  it("rejects mismatched source keys and names", () => {
    expect(
      loadProjectSnapshot({
        format: "rpl26-project",
        version: 1,
        snapshot: { format: "rpl26-session", version: 1, stack: [], variables: {} },
        sources: {
          VELOCITY: {
            name: "SPEED",
            source: "<< * >>",
            installedHash: "abc",
            updatedAt: "2026-05-06T00:00:00.000Z",
            examples: []
          }
        }
      })
    ).toEqual({ ok: false, error: { path: "sources.VELOCITY.name", message: "expected source name to match key" } });
  });

  it("preserves nested validation paths for expected stack objects", () => {
    expect(
      loadProjectSnapshot({
        format: "rpl26-project",
        version: 1,
        snapshot: { format: "rpl26-session", version: 1, stack: [], variables: {} },
        sources: {
          VELOCITY: {
            name: "VELOCITY",
            source: "<< * >>",
            installedHash: "abc",
            updatedAt: "2026-05-06T00:00:00.000Z",
            examples: [
              {
                input: "3 4 VELOCITY",
                expectedStack: [{ kind: "real", value: "x" }]
              }
            ]
          }
        }
      })
    ).toEqual({
      ok: false,
      error: { path: "sources.VELOCITY.examples[0].expectedStack[0].value", message: "expected number" }
    });
  });

  it("omits absent optional fields from canonical project output", () => {
    const result = loadProjectSnapshot({
      format: "rpl26-project",
      version: 1,
      snapshot: { format: "rpl26-session", version: 1, stack: [], variables: {} },
      sources: {
        VELOCITY: {
          name: "VELOCITY",
          source: "<< * >>",
          installedHash: "abc",
          updatedAt: "2026-05-06T00:00:00.000Z",
          examples: [{ input: "3 4 VELOCITY", expectedStack: [{ kind: "real", value: 12 }] }]
        }
      }
    });

    expect(result).toStrictEqual({
      ok: true,
      project: {
        format: "rpl26-project",
        version: 1,
        snapshot: { format: "rpl26-session", version: 1, stack: [], variables: {} },
        sources: {
          VELOCITY: {
            name: "VELOCITY",
            source: "<< * >>",
            installedHash: "abc",
            updatedAt: "2026-05-06T00:00:00.000Z",
            examples: [{ input: "3 4 VELOCITY", expectedStack: [{ kind: "real", value: 12 }] }]
          }
        }
      }
    });
    expect(result.ok && Object.hasOwn(result.project.sources.VELOCITY, "notes")).toBe(false);
    expect(result.ok && Object.hasOwn(result.project.sources.VELOCITY.examples[0], "description")).toBe(false);
  });

  it("writes and reads project files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rpl26-project-"));
    const path = join(dir, "project.json");

    try {
      const project = {
        format: "rpl26-project" as const,
        version: 1 as const,
        snapshot: { format: "rpl26-session" as const, version: 1 as const, stack: [], variables: {} },
        sources: {}
      };

      expect(await writeProjectFile(path, project)).toEqual({ ok: true });
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual(project);
      expect(await readProjectFile(path)).toEqual({ ok: true, project });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
