import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { expect, it } from 'vitest';

const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const location = path.join(directory, entry.name);
    return entry.isDirectory()
      ? files(location)
      : /\.tsx?$/.test(location) && !location.includes('.test.')
        ? [location]
        : [];
  });
}

it('enforces dependency direction between application, layout, features and shared code', () => {
  const violations: string[] = [];
  for (const file of files(sourceRoot)) {
    const relative = path.relative(sourceRoot, file).replaceAll('\\', '/');
    const layer = relative.split('/')[0];
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const inspect = (node: ts.Node) => {
      const moduleLiteral =
        ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
          ? node.moduleSpecifier
          : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
            ? node.arguments[0]
            : undefined;
      if (moduleLiteral && ts.isStringLiteral(moduleLiteral)) {
        const specifier = moduleLiteral.text;
        const target = specifier.startsWith('@/')
          ? path.join(sourceRoot, specifier.slice(2))
          : specifier.startsWith('.')
            ? path.resolve(path.dirname(file), specifier)
            : null;
        if (target) {
          const destination = path.relative(sourceRoot, target).replaceAll('\\', '/');
          const targetLayer = destination.split('/')[0];
          if (layer === 'shared' && ['app', 'layouts', 'features'].includes(targetLayer))
            violations.push(`${relative} -> ${destination}`);
          if (layer === 'layouts' && ['app', 'features'].includes(targetLayer))
            violations.push(`${relative} -> ${destination}`);
          if (layer === 'features' && ['app', 'layouts'].includes(targetLayer))
            violations.push(`${relative} -> ${destination}`);
          if (
            layer === 'features' &&
            targetLayer === 'features' &&
            relative.split('/')[1] !== destination.split('/')[1]
          )
            violations.push(`${relative} -> ${destination}`);
        }
      }
      ts.forEachChild(node, inspect);
    };
    inspect(source);
    if (['features', 'layouts'].includes(layer) && /\bfetch\s*\(/.test(readFileSync(file, 'utf8')))
      violations.push(`${relative}: bypasses API transport`);
  }
  expect(violations).toEqual([]);
});
