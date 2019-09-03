"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var ts = __importStar(require("typescript"));
var console = require("console");
// Final list of ViewProps with members
var output = [];
// List of interfaces which have classes that extend React.Component<thatPropInterface>
// This is used to filter which interfaces we collect member information for
var componentPropTypes = [];
var filePath = "./node_modules/@types/react-native/index.d.ts";
/** Generate documentation for all classes in a set of .ts files */
function generateDocumentation(fileNames, options) {
    // Build a program using the set of root file names in fileNames
    var program = ts.createProgram(fileNames, options);
    // Get the checker, we will use it to find more about classes
    var checker = program.getTypeChecker();
    // Collect all the classes which inherit from React.Component, and add the type reference to the global componentPropTypes
    for (var _i = 0, _a = program.getSourceFiles(); _i < _a.length; _i++) {
        var sourceFile = _a[_i];
        ts.forEachChild(sourceFile, function (node) {
            if (!ts.isClassDeclaration(node)) {
                return;
            }
            node.forEachChild(function (_) {
                if (_.kind == ts.SyntaxKind.HeritageClause) {
                    if (_.getFullText().indexOf("React.Component") > 0) {
                        _.forEachChild(function (et) {
                            if (ts.isExpressionWithTypeArguments(et)) {
                                if (et.getFullText().indexOf("React.Component") > 0) {
                                    et.forEachChild(function (ett) {
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
    for (var _b = 0, _c = program.getSourceFiles(); _b < _c.length; _b++) {
        var sourceFile = _c[_b];
        // Walk the tree to search for classes
        ts.forEachChild(sourceFile, visit);
    }
    // Sort the output
    output.sort(function (a, b) {
        if (a.name < b.name) {
            return -1;
        }
        if (a.name > b.name) {
            return 1;
        }
        return 0;
    });
    var viewProps = output.find(function (_) { return _.name === "ViewProps"; });
    output.forEach(function (_) {
        var members = _.name === "ViewProps"
            ? _.members
            : _.members.filter(function (member) { return viewProps.members.indexOf(member) < 0; });
        members.sort();
        if (_.name.endsWith("Props")) {
            console.log("-- " + _.name.slice(0, _.name.length - 5) + " --");
        }
        else {
            console.log("-- " + _.name + " --");
        }
        members.forEach(function (member) {
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
    function visit(node) {
        // Only consider exported nodes
        if (!isExportedInterface(node)) {
            return;
        }
        if (ts.isInterfaceDeclaration(node) && node.name) {
            var symbol_1 = checker.getSymbolAtLocation(node.name);
            if (symbol_1) {
                if (isComponentProps(node, symbol_1) &&
                    output.findIndex(function (_) { return _.name === symbol_1.getName(); }) < 0) {
                    var doc = {
                        name: symbol_1.getName(),
                        members: [],
                        members2: []
                    };
                    output.push(doc);
                    addMembersFromExtends(node, checker, doc);
                    addMembers(symbol_1, doc);
                }
            }
        }
    }
    function isComponentProps(node, symbol) {
        return componentPropTypes.indexOf(symbol.getName()) > 0;
    }
    function addMembers(symbol, doc) {
        symbol.members.forEach(function (member) {
            doc.members.push(member.getName());
            doc.members2.push({
                name: member.getName(),
                datatype: member.valueDeclaration
                    ? member.valueDeclaration.getText()
                    : member.getName()
            });
        });
    }
    function getListOfExtends(node) {
        var list = [];
        node.forEachChild(function (_) {
            if (_.kind == ts.SyntaxKind.HeritageClause) {
                _.forEachChild(function (et) {
                    if (ts.isExpressionWithTypeArguments(et)) {
                        ts.forEachChild(et, function (ett) {
                            if (ts.isIdentifier(ett)) {
                                list.push(ett);
                                list.push.apply(list, getListOfExtends(ett));
                            }
                        });
                    }
                });
            }
        });
        return list;
    }
    function addMembersFromExtends(node, checker, doc) {
        getListOfExtends(node).forEach(function (ett) {
            var symbol = checker.getSymbolAtLocation(ett);
            if (symbol) {
                addMembers(symbol, doc);
            }
        });
    }
    /** True if this is visible outside this file, false otherwise */
    function isExportedInterface(node) {
        if (!ts.isInterfaceDeclaration(node)) {
            return false;
        }
        //return true;
        return ((ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 ||
            (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile));
    }
}
generateDocumentation([filePath], {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS
});
