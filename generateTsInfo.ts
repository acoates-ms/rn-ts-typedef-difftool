import * as ts from "typescript";
import console = require("console");

interface MemberInfo {
  name: string;
  datatype: string;
}

interface DocEntry {
  name: string;
  members: string[];
  members2: MemberInfo[];
}

// Final list of ViewProps with members
let output: DocEntry[] = [];

// List of interfaces which have classes that extend React.Component<thatPropInterface>
// This is used to filter which interfaces we collect member information for
let componentPropTypes: string[] = [];

const filePath = "./node_modules/@types/react-native/index.d.ts";
/** Generate documentation for all classes in a set of .ts files */
function generateDocumentation(
  fileNames: string[],
  options: ts.CompilerOptions
): void {
  // Build a program using the set of root file names in fileNames
  let program = ts.createProgram(fileNames, options);

  // Get the checker, we will use it to find more about classes
  let checker = program.getTypeChecker();

  // Collect all the classes which inherit from React.Component, and add the type reference to the global componentPropTypes
  for (const sourceFile of program.getSourceFiles()) {
    ts.forEachChild(sourceFile, node => {
      if (!ts.isClassDeclaration(node)) {
        return;
      }
      node.forEachChild(_ => {
        if (_.kind == ts.SyntaxKind.HeritageClause) {
          if (_.getFullText().indexOf("React.Component") > 0) {
            _.forEachChild(et => {
              if (ts.isExpressionWithTypeArguments(et)) {
                if (et.getFullText().indexOf("React.Component") > 0) {
                  et.forEachChild(ett => {
                    if (ts.isTypeReferenceNode(ett)) {
                      componentPropTypes.push(ett.typeName.getFullText());
                    }
                  });
                }
              }
            });
          }
        }
      });
    });
  }

  for (const sourceFile of program.getSourceFiles()) {
    // Walk the tree to search for classes
    ts.forEachChild(sourceFile, visit);
  }

  // Sort the output
  output.sort((a: DocEntry, b: DocEntry) => {
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return 0;
  });

  const viewProps = output.find(_ => _.name === "ViewProps")!;

  output.forEach(_ => {
    let members =
      _.name === "ViewProps"
        ? _.members
        : _.members.filter(member => viewProps.members.indexOf(member) < 0);

    members.sort();

    if (_.name.endsWith("Props")) {
      console.log("-- " + _.name.slice(0, _.name.length - 5) + " --");
    } else {
      console.log("-- " + _.name + " --");
    }

    members.forEach(member => {
      console.log(member);
    });
    /*
    _.members2.forEach(member => {
      console.log(member.datatype);
    });
    */
    console.log("\n");
  });

  return;

  /** visit nodes finding component properties interfaces and adding their member information to output */
  function visit(node: ts.Node) {
    // Only consider exported nodes
    if (!isExportedInterface(node)) {
      return;
    }

    if (ts.isInterfaceDeclaration(node) && node.name) {
      let symbol = checker.getSymbolAtLocation(node.name);
      if (symbol) {
        if (
          isComponentProps(node, symbol) &&
          output.findIndex(_ => _.name === symbol!.getName()) < 0
        ) {
          let doc: DocEntry = {
            name: symbol.getName(),
            members: [],
            members2: []
          };
          output.push(doc);
          addMembersFromExtends(node, checker, doc);
          addMembers(symbol, doc);
        }
      }
    }
  }

  function isComponentProps(node: ts.Node, symbol: ts.Symbol) {
    return componentPropTypes.indexOf(symbol.getName()) > 0;
  }

  function addMembers(symbol: ts.Symbol, doc: DocEntry) {
    symbol.members!.forEach(member => {
      doc.members.push(member.getName());

      doc.members2.push({
        name: member.getName(),
        datatype: member.valueDeclaration
          ? member.valueDeclaration.getText()
          : member.getName()
      });
    });
  }

  function getListOfExtends(node: ts.Node) {
    let list: ts.Node[] = [];
    node.forEachChild(_ => {
      if (_.kind == ts.SyntaxKind.HeritageClause) {
        _.forEachChild(et => {
          if (ts.isExpressionWithTypeArguments(et)) {
            ts.forEachChild(et, ett => {
              if (ts.isIdentifier(ett)) {
                list.push(ett);
                list.push(...getListOfExtends(ett));
              }
            });
          }
        });
      }
    });
    return list;
  }

  function addMembersFromExtends(
    node: ts.Node,
    checker: ts.TypeChecker,
    doc: DocEntry
  ) {
    getListOfExtends(node).forEach(ett => {
      let symbol = checker.getSymbolAtLocation(ett);
      if (symbol) {
        addMembers(symbol, doc);
      }
    });
  }

  /** True if this is visible outside this file, false otherwise */
  function isExportedInterface(node: ts.Node): boolean {
    if (!ts.isInterfaceDeclaration(node)) {
      return false;
    }
    //return true;
    return (
      (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 ||
      (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    );
  }
}

generateDocumentation([filePath], {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS
});
