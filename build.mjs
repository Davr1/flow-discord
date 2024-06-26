import * as esbuild from "esbuild";

await esbuild.build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    outfile: "dist/main.js",
    platform: "node",
    minify: true,
    target: "ES2018",
});
