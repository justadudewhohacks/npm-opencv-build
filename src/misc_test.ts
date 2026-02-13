import assertNode from "node:assert";
import { args2Option } from "./misc.ts";

Deno.test("utils", () => {
  Deno.test("args2Option should parse standalone unknown bool flags", () => {
    const env = args2Option(["--FOO"]);
    if (env.extra) {
      assertNode.deepStrictEqual(env.extra.FOO, "1");
    }
  });

  Deno.test("args2Option should parse unknown flags with value", () => {
    const env = args2Option(["--FOO", "bar"]);
    if (env.extra) {
      assertNode.deepStrictEqual(env.extra.FOO, "bar");
    }
  });

  Deno.test("args2Option should parse unknown string flags with value", () => {
    const env = args2Option(["--FOO=bar"]);
    if (env.extra) {
      assertNode.deepStrictEqual(env.extra.FOO, "bar");
    }
  });
});
