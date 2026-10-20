import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const directory = path.dirname(fileURLToPath(import.meta.url));
const requireNative = createRequire(import.meta.url);

// Execute the production TypeScript modules with optional service-boundary fakes.
export function createLoader(stubs = {}) {
  const modules = new Map();
  function load(relativePath) {
    const filename = path.resolve(directory, "..", relativePath);
    if (modules.has(filename)) return modules.get(filename).exports;
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText;
    const loaded = { exports: {} };
    modules.set(filename, loaded);
    const resolve = (id) =>
      id in stubs
        ? stubs[id]
        : id.startsWith("@/")
          ? load(`${id.slice(2)}.ts`)
          : requireNative(id);
    new Function("require", "module", "exports", source)(
      resolve,
      loaded,
      loaded.exports,
    );
    return loaded.exports;
  }
  return load;
}

export function browserStorage() {
  const data = new Map();
  global.window = { dispatchEvent() {} };
  global.localStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
  return {
    data,
    cleanup() {
      delete global.window;
      delete global.localStorage;
    },
  };
}
