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
  if (["with", "default"].includes(name)) {
    return `_${name}`;
  }

  return name;
}

function toTypescriptType(luaType: string) {
  const luaToTsTypeMap = {
    nil: "undefined",
    table: "{}",
    int: "number",
    float: "number",
    bool: "boolean",
  };

  return luaToTsTypeMap[luaType] ?? luaType;
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

export function generateClassMethods(
  methods?: CleanMethod[],
  isExpFuncs: boolean = false
) {
  if (methods === undefined) return "";

  return methods
    .flatMap((method) => generateClassMethod(method, isExpFuncs))
    .filter((line) => !!line)
    .join("\n");
}

export function generateClassMethod(
  method: CleanMethod,
  isExpFunc: boolean = false
) {
  const returns = generateClassMethodReturns(method.returns);

  return `
  
  ${generateInlineComment(method.description)}
  ${isExpFunc ? "export function " : ""}${
    method.name
  }(${generateClassMethodParameters(method.params)}) ${
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

export function generateClassOperation() {}

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

export function generateLibrary(data: CleanYamlData) {
  const code = `
  
  declare namespace ${data.name} {
    ${generateClassMethods(data.methods, true)}
  }

  `;

  return prettier.format(code, { parser: "typescript" });
}
