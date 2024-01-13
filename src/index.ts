import glob from 'fast-glob';
import ignore from 'fast-ignore';
import { copyFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { replaceTscAliasPaths } from 'tsc-alias';
import ts from 'typescript';

export interface Options {}

export default function react(options?: Options) {
  return {
    build: async () => {
      const outDir = join(process.cwd(), 'dist');
      const tsconfigFilePath = join(process.cwd(), 'tsconfig.json');

      await rm(outDir, { recursive: true, force: true });

      // read tsconfig.json
      let tsconfig: any = {};
      try {
        tsconfig = await readFile(tsconfigFilePath, 'utf-8');
      } catch (e) {
        //
      }

      // find source files
      let sources = await glob('src/**/*.{js,jsx,ts,tsx}');
      const ig = ignore([
        '*.spec.js',
        '*.spec.jsx',
        '*.spec.ts',
        '*.spec.tsx',
        ...(tsconfig.exclude || []),
      ]);
      sources = sources.filter((file) => !ig(file));

      // find assets files
      const assets = await glob('src/**/*.{css,less,scss}');

      // compile esm and d.ts
      await (async () => {
        const compilerOptionsResult = ts.convertCompilerOptionsFromJson(tsconfig, process.cwd());
        const compilerOptions: ts.CompilerOptions = {
          ...compilerOptionsResult.options,
          declaration: true,
          noEmit: false,
          module: ts.ModuleKind.ESNext,
          outDir,
        };
        const program = ts.createProgram(sources, compilerOptions);
        program.emit();
        // convert tsconfig.json paths (alias) to relative (real) path
        await replaceTscAliasPaths({
          configFile: tsconfigFilePath,
          declarationDir: outDir,
          outDir,
        });

        // copy styles, images, etc.
        await Promise.all(
          assets.map((asset) =>
            copyFile(join(process.cwd(), asset), join(outDir, asset.substring(3)))
          )
        );
      })();

      // compile cjs
      await (async () => {
        const compilerOptionsResult = ts.convertCompilerOptionsFromJson(tsconfig, process.cwd());
        const compilerOptions: ts.CompilerOptions = {
          ...compilerOptionsResult.options,
          declaration: false,
          noEmit: false,
          module: ts.ModuleKind.CommonJS,
          outDir: join(outDir, 'cjs'),
        };
        const program = ts.createProgram(sources, compilerOptions);
        program.emit();

        // copy styles, images, etc.
        await Promise.all(
          assets.map((asset) =>
            copyFile(join(process.cwd(), asset), join(outDir, 'cjs', asset.substring(3)))
          )
        );
      })();
    },
  };
}

react().build();
