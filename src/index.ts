import glob from 'fast-glob';
import ignore from 'fast-ignore';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { replaceTscAliasPaths } from 'tsc-alias';
import { CompilerOptions, convertCompilerOptionsFromJson, createProgram } from 'typescript';

export interface Options {}

export default function (options: Options) {
  return {
    build: async () => {
      const outDir = join(process.cwd(), 'd.ts');
      const tsconfigFilePath = join(process.cwd(), 'tsconfig.json');

      // Read tsconfig.json
      let tsconfig = {};
      try {
        tsconfig = await readFile(tsconfigFilePath, 'utf-8');
      } catch (e) {
        //
      }

      // Convert
      const compilerOptionsResult = convertCompilerOptionsFromJson(tsconfig, process.cwd());
      const compilerOptions: CompilerOptions = {
        ...compilerOptionsResult.options,
        declaration: true,
        noEmit: false,
        outDir,
        rootDir: process.cwd(),
      };

      const fileNames = (await glob('src/**/*.{js,jsx,ts,tsx}')).filter(
        ignore(['*.spec.js', '*.spec.jsx', '*.spec.ts', '*.spec.tsx'])
      );

      // Prepare and emit the d.ts files
      const program = createProgram(fileNames, compilerOptions);
      program.emit();

      // Convert tsconfig.json paths (alias) to relative (real) path
      await replaceTscAliasPaths({
        configFile: tsconfigFilePath,
        declarationDir: rawDir,
        outDir: rawDir,
      });
    },
  };
}
