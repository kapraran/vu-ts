import prettier from "prettier";
import {
  CleanYamlData,
  Constructor,
  ExtParam,
  ExtValueType,
  ValueType,
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
  class ${data.name} ${data.inherits ? `extends ${data.inherits}` : ""} {
    ${generateClassConstructors(data.constructors)}
    ${generateClassValues(data.values)}
    ${generateClassStatic(data.static)}
  }
  `;

  return prettier.format(code, { parser: "typescript" });
}

export function generateClassProperty() {}

export function generateClassMethodParameter() {}

export function generateClassMethodParameters() {}

export function generateClassMethod() {}

export function generateClassConstructors(constructors: Constructor[]) {
  return "";
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
  enum ${data.name} {
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
