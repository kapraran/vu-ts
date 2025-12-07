import {
  CleanClassFile,
  MethodType,
  OperatorType,
  ParamType,
  PropType,
  ReturnType,
} from "../parsers/common";
import { fixParamName, fixTypeName } from "./common";

const opMapping: Record<string, string> = {
  add: "LuaAdditionMethod",
  sub: "LuaSubtractionMethod",
  mult: "LuaMultiplicationMethod",
  div: "LuaDivisionMethod",
  // Note: eq and lt might not have Method versions in TypeScriptToLua
  // They may need to be handled as standalone functions or not supported
  // lt: "LuaLessThanMethod", // Uncomment if TypeScriptToLua supports this
};

function sortMethods(a: MethodType, b: MethodType) {
  return a.name > b.name ? 1 : -1;
}

function generateReturnsCode(m: MethodType) {
  if (m.name === "constructor") return "";
  if (m.returns.length === 0) return ": void";

  const returnsStr = m.returns
    .map((r) => [
      r,
      `${fixTypeName(r.type)} ${r.array ? "[]" : ""} ${
        r.nullable ? "| null" : ""
      }`,
    ])
    .map(([r, rstr]) => ((r as ReturnType).table ? `LuaTable<${rstr}>` : rstr))
    .join(", ");

  return (
    ":" +
    (m.returns.length > 1 ? `LuaMultiReturn<[${returnsStr}]>` : returnsStr)
  );
}

function generatePropertyCode(p: PropType) {
  return `${p.static ? "static" : ""} ${p.readOnly ? "readonly" : ""} ${
    p.name
  }: ${fixTypeName(p.type)} ${p.table ? "[]" : ""}${
    p.nullable ? "| null" : ""
  }`;
}

function generateOperatorCode(op: OperatorType, data: CleanClassFile): string {
  const operatorType = opMapping[op.type];
  if (!operatorType) {
    console.warn(`Unknown operator type: ${op.type} for ${data.name}`);
    return "";
  }
  
  const rhsType = fixTypeName(op.rhs);
  
  // Generate helper method using TypeScriptToLua operator mapping
  // Method version takes 2 type params: <Self, RHS>
  // Example: add: LuaAdditionMethod<Vec3, Vec3>
  // Usage: vec3.add(other) transpiles to vec3 + other in Lua
  return `${op.type}: ${operatorType}<${data.name}, ${rhsType}>`;
}

function generateMethodCode(m: MethodType, data: CleanClassFile) {
  return `${data.declareAs === "namespace" ? "function" : ""}  ${m.name} ${
    m.generic ? `<${m.generic}>` : ""
  } (${generateParamsCode(m, data)}) ${generateReturnsCode(m)}`;
}

function generateParamsCode(m: MethodType, data: CleanClassFile) {
  return m.params.map((p) => generateParamCode(p, data)).join(", ");
}

function generateParamCode(p: ParamType, data: CleanClassFile) {
  // TODO p.table
  // In .d.ts files, default values are not allowed. Make parameter optional instead.
  // Check if parameter has a default value (including empty string, 0, false, etc.)
  const hasDefault = p.default !== undefined && p.default !== null;
  return `${p.variadic ? "..." : ""}${fixParamName(p.name)}${hasDefault ? "?" : ""}: ${fixTypeName(
    p.type
  )} ${p.nullable ? "| null" : ""}`;
}

export default function (data: CleanClassFile) {
  // Check if class has constructors
  const hasConstructors = data.methods.some((m) => m.name === "constructor");
  
  // Add @customConstructor annotation for all classes with constructors
  // This tells TypeScriptToLua to call the constructor directly (e.g., Vec3(1,2,3))
  // instead of using __TS__New (which expects a ____constructor method)
  // If a class doesn't need this annotation, TypeScriptToLua will ignore it
  const customConstructorAnnotation = hasConstructors
    ? `/** @customConstructor ${data.name} */\n  `
    : "";

  return `

  ${customConstructorAnnotation}declare ${data.declareAs} ${data.name} ${
    data.inherits ? `extends ${data.inherits}` : ""
  } {

    ${data.properties.map(generatePropertyCode).join(";\n")}

    ${data.methods
      .sort(sortMethods)
      .map((m) => generateMethodCode(m, data))
      .join(";\n")}

    ${data.operators
      .map((op) => generateOperatorCode(op, data))
      .filter((code) => code.length > 0)
      .join(";\n")}
  }
  
  `;
}
