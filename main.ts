import * as OpenCVBuilder from "./src/OpenCVBuilder.ts";
// Learn more at https://deno.land/manual/examples/module_metadata#concepts
// if (import.meta.main)
const builder = new OpenCVBuilder.OpenCVBuilder(Deno.args);
if (builder.env.json) {
  console.log(JSON.stringify(builder.getBuildInfo(), null, 2));
} else {
  void builder.install();
}
