import { describe, test, expect } from "bun:test";
import { runCLI, parseJSON } from "./helpers";

describe("remoteok-cli live smoke test", () => {
  test("search returns real results with non-null id/title/url", async () => {
    const result = await runCLI(["search", "-q", "machine learning", "-n", "5", "--format", "json"]);
    const data = parseJSON<{ meta: { count: number }; results: any[] }>(result);
    expect(data.results.length).toBeGreaterThan(0);
    const first = data.results[0];
    expect(first.id).toBeTruthy();
    expect(first.title).toBeTruthy();
    expect(first.url).toContain("remoteok.com");
  }, 30000);

  test("detail returns a readable description for a job from search", async () => {
    const search = await runCLI(["search", "-q", "machine learning", "-n", "1", "--format", "json"]);
    const data = parseJSON<{ results: any[] }>(search);
    expect(data.results.length).toBeGreaterThan(0);

    const detail = await runCLI(["detail", data.results[0].id, "--format", "plain"]);
    expect(detail.exitCode).toBe(0);
    expect(detail.stdout.length).toBeGreaterThan(20);
  }, 30000);

  test("missing --query exits 1 with a JSON error on stderr", async () => {
    const result = await runCLI(["search", "--format", "json"]);
    expect(result.exitCode).toBe(1);
    const err = JSON.parse(result.stderr);
    expect(err.code).toBe("NO_QUERY");
  }, 30000);

  test("unknown flag exits 1 with a JSON error on stderr", async () => {
    const result = await runCLI(["search", "-q", "test", "--bogus"]);
    expect(result.exitCode).toBe(1);
    const err = JSON.parse(result.stderr);
    expect(err.code).toBe("UNKNOWN_FLAG");
  }, 30000);
});
