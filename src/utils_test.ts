import assertNode from "node:assert";
import * as utils from "./utils.ts";

Deno.test("protect", function testLib() {
  assertNode(utils.protect("a") === "a");
});

Deno.test("toExecCmd", function testLib() {
  assertNode(utils.toExecCmd("a", ["b", "c"]) === "a b c");
});

Deno.test("exec", async function testLib() {
  const result = await utils.exec("echo foo");
  assertNode(result.trim() === "foo", `result value is "${result}"`);
});

Deno.test("execSync", function testLib() {
  const result = utils.execSync("echo foo");
  assertNode(result.trim() === "foo", `result value is "${result}"`);
});
