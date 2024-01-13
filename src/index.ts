import glob from 'fast-glob';
import ignore from 'fast-ignore';
import { readFile, rm } from 'fs/promises';
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
      let fileNames = await glob('src/**/*.{js,jsx,ts,tsx}');
      const ig = ignore([
        '*.spec.js',
        '*.spec.jsx',
        '*.spec.ts',
        '*.spec.tsx',
        ...(tsconfig.exclude || []),
      ]);
      fileNames = fileNames.filter((file) => !ig(file));

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
        const program = ts.createProgram(fileNames, compilerOptions);
        program.emit();
        // convert tsconfig.json paths (alias) to relative (real) path
        await replaceTscAliasPaths({
          configFile: tsconfigFilePath,
          declarationDir: outDir,
          outDir,
        });

        // TODO copy styles, images, etc.
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
        const program = ts.createProgram(fileNames, compilerOptions);
        program.emit();

        // TODO copy styles, images, etc.
      })();
    },
  };
}

react().build();
