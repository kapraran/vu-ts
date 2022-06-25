import prettier from "prettier";
import {
  CleanMethod,
  CleanYamlData,
  ExtParam,
  ExtProp,
  ReturnType,
} from "../parsers/parser";

const opMapping = {
  add: "LuaAdditionMethod",
  sub: "LuaSubtractionMethod",
  mult: "LuaMultiplicationMethod",
  div: "LuaDivisionMethod",
  lt: "LuaLessThanMethod",
};

function replaceNotAllowedNames(name: string) {
  if (name === "with") {
    return `_${name}`;
  }

  return name;
}

function toTypescriptType(luaType: string) {
  if (luaType === "nil") return "undefined";
  if (luaType === "table") return "{}";
  if (luaType === "int") return "number";
  if (luaType === "float") return "number";
  if (luaType === "bool") return "boolean";

  return luaType;
}

export function generateClass(data: CleanYamlData) {
  const code = `
  ${generateInlineComment(data.description)}
  declare class ${data.name} ${
    data.inherits ? `extends ${data.inherits}` : ""
  } {
    // static
    ${generateClassProperties(data.static)}

    // values
    ${generateClassProperties(data.values)}
    
    // properties
    ${generateClassProperties(data.properties)}
    
    // constructors
    ${generateClassMethods(data.constructors)}

    // methods
    ${generateClassMethods(data.methods)}
  }
  `;

  return prettier.format(code, { parser: "typescript" });
}

export function generateClassProperties(props: ExtProp[], separator = "\n") {
  return props
    .flatMap((p) => generateClassProperty(p))
    .filter((line) => !!line)
    .join(separator);
}

export function generateClassProperty(prop: ExtProp) {
  const propType =
    prop.type !== undefined
      ? [
          `${toTypescriptType(prop.type)}${prop.array ? "[]" : ""}`,
          prop.nullable ? "null" : undefined,
        ]
          .filter((type) => !!type)
          .join("|")
      : undefined;
  const mods = [
    prop.static ? "static" : "",
    prop.readOnly ? "readonly" : "",
  ].join(" ");

  return [
    generateInlineComment(prop.description),
    `${mods} ${prop.name}${propType ? ` : ${propType}` : ""} ${
      prop.value ? ` = ${prop.value}` : ""
    }`,
  ];
}

export function generateClassMethodParameter(param: ExtParam) {
  return `${param.variadic ? "..." : ""}${replaceNotAllowedNames(
    param.name
  )}: ${toTypescriptType(param.type)}${param.table ? "[]" : ""}${
    param.nullable ? " | undefined" : ""
  }${param.default ? ` = ${param.default}` : ""}`;
}

export function generateClassMethodParameters(params?: ExtParam[]) {
  if (params === undefined) return "";

  return params
    .flatMap((param) => generateClassMethodParameter(param))
    .filter((line) => !!line)
    .join(", ");
}

export function generateClassMethods(methods?: CleanMethod[]) {
  if (methods === undefined) return "";

  return methods
    .flatMap((method) => generateClassMethod(method))
    .filter((line) => !!line)
    .join("\n");
}

export function generateClassMethod(method: CleanMethod) {
  const returns = generateClassMethodReturns(method.returns);

  return `
  
  ${generateInlineComment(method.description)}
  ${method.name}(${generateClassMethodParameters(method.params)}) ${
    returns ? `: ${returns}` : ""
  };
  
  `;
}

function generateClassMethodReturns(returns: ReturnType[]) {
  if (returns.length === 0) return undefined;

  if (returns.length > 1) console.warn("only supports 1 return value");

  const singleReturn = returns[0];

  return `${toTypescriptType(singleReturn.type)}${
    singleReturn.table ? "[]" : ""
  }${singleReturn.nullable ? " | null" : ""}`;
}

// export function generateClassConstructors(constructors: CleanConstructor[]) {
//   return constructors
//     .flatMap((constructor) => generateClassConstructor(constructor))
//     .filter((line) => !!line)
//     .join("\n");
// }

// export function generateClassConstructor(constructor: CleanConstructor) {
//   if (constructor === null) {
//     console.warn("null constructor!");
//     return "";
//   }

//   return [
//     generateInlineComment(constructor.description),
//     `constructor(${generateClassMethodParameters(constructor.params)});`,
//   ];
// }

// export function generateClassValues(values: ExtValueType[]) {
//   return values
//     .map((v) => `static readonly ${v.name} = ${v.value};`)
//     .join("\n");
// }

export function generateClassOperation() {}

// export function generateClassStatic(_static: ExtParam[]) {
//   return _static
//     .map((s) => {
//       return `
//       ${generateInlineComment(s.description)}
//       static readonly ${s.name} : ${s.type}${s.table ? "[]" : ""} ${
//         s.default ? `= ${s.default}` : ""
//       };
//     `;
//     })
//     .join("\n");
// }

function generateInlineComment(comment?: string) {
  return comment ? `// ${comment.replace(/\n/g, "\n//")}` : "";
}

export function generateEnum(data: CleanYamlData) {
  const code = `
  ${generateInlineComment(data.description)}
  declare enum ${data.name} {
    ${generateClassProperties(
      data.values.map((v) => ({ ...v, static: false, readOnly: false })),
      ",\n"
    )}
  }
  `;

  return prettier.format(code, { parser: "typescript" });
}
