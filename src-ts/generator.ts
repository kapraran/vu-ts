import { Method } from "got/dist/source";
import prettier from "prettier";
import {
  CleanConstructor,
  CleanMethod,
  CleanYamlData,
  ExtParam,
  ExtProp,
  ExtValueType,
  ReturnType,
} from "./parser";

const opMapping = {
  add: "LuaAdditionMethod",
  sub: "LuaSubtractionMethod",
  mult: "LuaMultiplicationMethod",
  div: "LuaDivisionMethod",
  lt: "LuaLessThanMethod",
};

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
    ${generateClassStatic(data.static)}

    ${generateClassValues(data.values)}
    
    ${generateClassProperties(data.properties)}
    
    ${generateClassConstructors(data.constructors)}

    ${generateClassMethods(data.methods)}
  }
  `;

  return prettier.format(code, { parser: "typescript" });
}

export function generateClassProperties(props: ExtProp[]) {
  return props
    .flatMap((p) => generateClassProperty(p))
    .filter((line) => !!line)
    .join("\n");
}

export function generateClassProperty(prop: ExtProp) {
  const propType = [
    `${toTypescriptType(prop.type)}${prop.array ? "[]" : ""}`,
    prop.nullable ? "null" : undefined,
  ]
    .filter((type) => !!type)
    .join("|");
  const mods = [prop.readOnly ? "readonly" : ""].join(" ");

  return [
    generateInlineComment(prop.description),
    `${mods} ${prop.name}: ${propType}`,
  ];
}

export function generateClassMethodParameter(param: ExtParam) {
  return `${param.variadic ? "..." : ""}${param.name}: ${toTypescriptType(
    param.type
  )}${param.table ? "[]" : ""}${param.nullable ? " | undefined" : ""}${
    param.default ? ` = ${param.default}` : ""
  }`;
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

export function generateClassConstructors(constructors: CleanConstructor[]) {
  return constructors
    .flatMap((constructor) => generateClassConstructor(constructor))
    .filter((line) => !!line)
    .join("\n");
}

export function generateClassConstructor(constructor: CleanConstructor) {
  if (constructor === null) {
    console.warn("null constructor!");
    return "";
  }

  return [
    generateInlineComment(constructor.description),
    `constructor(${generateClassMethodParameters(constructor.params)});`,
  ];
}

export function generateClassValues(values: ExtValueType[]) {
  return values
    .map((v) => `static readonly ${v.name} = ${v.value};`)
    .join("\n");
}

export function generateClassOperation() {}

export function generateClassStatic(_static: ExtParam[]) {
  return _static
    .map((s) => {
      return `
      ${generateInlineComment(s.description)}
      static readonly ${s.name} : ${s.type}${s.table ? "[]" : ""} ${
        s.default ? `= ${s.default}` : ""
      };
    `;
    })
    .join("\n");
}

function generateInlineComment(comment?: string) {
  return comment ? `// ${comment}` : "";
}

export function generateEnum(data: CleanYamlData) {
  const code = `
  ${generateInlineComment(data.description)}
  declare enum ${data.name} {
    ${data.values
      .map((v) => [
        generateInlineComment(v.description),
        `${v.name} = ${v.value},`,
      ])
      .flat()
      .filter((s) => s !== undefined && s !== "")
      .join("\n")}
  }
  `;

  return prettier.format(code, { parser: "typescript" });
}
