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
};

// Note: eq (==) and lt (<) operators are not supported by TypeScriptToLua
// See: https://typescripttolua.github.io/docs/advanced/language-extensions/#supported-operators
// These operators exist in the YAML docs but cannot be generated as TypeScript operators
// They are silently skipped during generation

function sortMethods(a: MethodType, b: MethodType) {
  return a.name > b.name ? 1 : -1;
}

function generateReturnsCode(m: MethodType) {
  if (m.name === "constructor") return "";
  if (m.returns.length === 0) return ": void";

  const returnsStr = m.returns
    .map((r) => {
      const baseType = fixTypeName(r.type);
      const nullable = r.nullable ? "| null" : "";

      // Handle array types - use vector<T> instead of T[]
      if (r.array) {
        const vectorType = `vector<${baseType}${nullable}>`;
        return (r as ReturnType).table ? `LuaTable<${vectorType}>` : vectorType;
      }

      // Handle non-array types
      const typeStr = `${baseType}${nullable}`;
      return (r as ReturnType).table ? `LuaTable<${typeStr}>` : typeStr;
    })
    .join(", ");

  return (
    ":" +
    (m.returns.length > 1 ? `LuaMultiReturn<[${returnsStr}]>` : returnsStr)
  );
}

function generatePropertyCode(p: PropType) {
  const baseType = fixTypeName(p.type);
  const nullable = p.nullable ? "| null" : "";

  // Handle array types - use vector<T> instead of T[]
  let typeStr: string;
  if (p.array) {
    typeStr = `vector<${baseType}${nullable}>`;
  } else {
    typeStr = `${baseType}${p.table ? "[]" : ""}${nullable}`;
  }

  return `${p.static ? "static" : ""} ${p.readOnly ? "readonly" : ""} ${
    p.name
  }: ${typeStr}`;
}

function generateOperatorCode(op: OperatorType, data: CleanClassFile): string {
  const operatorType = opMapping[op.type];
  const rhsType = fixTypeName(op.rhs);
  const returnType = fixTypeName(op.returns);

  if (operatorType) {
    // Supported operator - generate TypeScriptToLua operator method
    const operatorNames: Record<string, string> = {
      add: "+",
      sub: "-",
      mult: "*",
      div: "/",
    };
    const operatorSymbol = operatorNames[op.type] || op.type;

    return `/**\n     * ${
      op.type === "add"
        ? "Addition"
        : op.type === "sub"
        ? "Subtraction"
        : op.type === "mult"
        ? "Multiplication"
        : "Division"
    } operator.\n     * @param other The right-hand side operand\n     * @returns The result of ${
      data.name
    } ${operatorSymbol} ${rhsType}\n     * @example\n     * const a = ${
      data.name
    }(1, 2, 3);\n     * const b = ${
      data.name
    }(4, 5, 6);\n     * const result = a.${
      op.type
    }(b); // Transpiles to: a ${operatorSymbol} b\n     */\n    ${
      op.type
    }: ${operatorType}<${data.name}, ${rhsType}>`;
  }

  // Unsupported operators (eq, lt) - TypeScriptToLua doesn't support these as operator methods
  if (op.type === "eq") {
    return `/**\n     * Equality comparison operator.\n     * Compares this ${data.name} with another ${rhsType} for equality.\n     * @param other The right-hand side operand to compare against\n     * @returns \`true\` if both operands are equal, \`false\` otherwise\n     * @example\n     * const a = ${data.name}(1, 2, 3);\n     * const b = ${data.name}(1, 2, 3);\n     * if (a.eq(b)) { // Transpiles to: if a:__eq(b) then\n     *   print("Equal");\n     * }\n     * @see https://www.lua.org/pil/13.2.html\n     * @customName __eq\n     */\n    eq(other: ${rhsType}): ${returnType};`;
  } else if (op.type === "lt") {
    return `/**\n     * Less-than comparison operator.\n     * Compares this ${data.name} with another ${rhsType} using less-than comparison.\n     * @param other The right-hand side operand to compare against\n     * @returns \`true\` if this operand is less than the other, \`false\` otherwise\n     * @example\n     * const a = ${data.name}(1, 2, 3);\n     * const b = ${data.name}(4, 5, 6);\n     * if (a.lt(b)) { // Transpiles to: if a:__lt(b) then\n     *   print("a is less than b");\n     * }\n     * @see https://www.lua.org/pil/13.2.html\n     * @customName __lt\n     */\n    lt(other: ${rhsType}): ${returnType};`;
  }

  return "";
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
  return `${p.variadic ? "..." : ""}${fixParamName(p.name)}${
    hasDefault ? "?" : ""
  }: ${fixTypeName(p.type)} ${p.nullable ? "| null" : ""}`;
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

  // Generate generic parameters if present
  const genericParams = data.generics
    ? `<${Object.entries(data.generics)
        .map(([name, defaultType]) => {
          // Special handling for HookContext TPassArgs - it must extend array type
          if (data.name === "HookContext" && name === "TPassArgs") {
            return defaultType
              ? `${name} extends any[] = ${defaultType}`
              : `${name} extends any[]`;
          }
          return defaultType ? `${name} = ${defaultType}` : name;
        })
        .join(", ")}>`
    : "";

  return `

  ${customConstructorAnnotation}declare ${data.declareAs} ${
    data.name
  }${genericParams} ${data.inherits ? `extends ${data.inherits}` : ""} {

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
