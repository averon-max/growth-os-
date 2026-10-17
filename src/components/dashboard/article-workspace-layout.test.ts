import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ts from "typescript";

const workspace = readFileSync(
  "src/components/dashboard/article-workspace.tsx",
  "utf8"
);
const page = readFileSync(
  "src/app/dashboard/content/articles/[id]/page.tsx",
  "utf8"
);
const css = readFileSync(
  "src/components/dashboard/article-workspace.module.css",
  "utf8"
);

function jsxContainsClass(
  source: string,
  className: string,
): ts.JsxElement[] {
  const tree = ts.createSourceFile(
    "page.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const nodes: ts.JsxElement[] = [];
  function visit(node: ts.Node): void {
    if (ts.isJsxElement(node) &&
      node.openingElement.attributes.properties.some(
        attr => ts.isJsxAttribute(attr) &&
          attr.name.getText(tree) === "className" &&
          (attr.initializer?.getText(tree).includes(className) ?? false)
      )
    ) {
      nodes.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return nodes;
}

describe("article workspace layout safety", () => {
  it("keeps long editorial warnings outside the action button row", () => {
    const rows = jsxContainsClass(workspace, "styles.headerActions");
    expect(rows).toHaveLength(1);
    expect(rows[0].getText()).not.toContain("role=\"alert\"");

    const warnings = jsxContainsClass(workspace, "styles.editorialAlert");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].getText()).toContain("role=\"alert\"");

    // An alert must not be a descendant of the header's flex action row.
    const rowStart = rows[0].getStart();
    const rowEnd = rows[0].getEnd();
    const warningStart = warnings[0].getStart();
    expect(warningStart).toBeGreaterThan(rowEnd);
    expect(warningStart).not.toBeLessThan(rowStart);
  });

  it("keeps the actual article ahead of optional technical diagnostics", () => {
    const workspaceIndex = page.indexOf("<ArticleWorkspace");
    const disclosureIndex = page.indexOf("<details className={styles.auditDisclosure}>");
    const researchIndex = page.indexOf("Search demand & actual heading outline");
    expect(workspaceIndex).toBeGreaterThan(0);
    expect(disclosureIndex).toBeGreaterThan(workspaceIndex);
    expect(researchIndex).toBeGreaterThan(disclosureIndex);
    expect(page).not.toContain("<details open");
    expect(css).toContain(".auditDisclosure");
    expect(css).toContain(".editorialAlert");
  });
});
