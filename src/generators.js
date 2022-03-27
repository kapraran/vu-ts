function toType(luaType) {
  if (luaType === "nil") return "undefined";
  if (luaType === "table") return "object";

  if (luaType === "int") return "number";
  if (luaType === "float") return "number";

  if (luaType === "bool") return "boolean";

  return luaType;
}

const opMapping = {
  add: "LuaAdditionMethod",
  sub: "LuaSubtractionMethod",
  mult: "LuaMultiplicationMethod",
  div: "LuaDivisionMethod",
  lt: "LuaLessThanMethod",
};

function genClass(d) {
  return `class ${d.name} ${d.inherits ? `extends ${d.inherits}` : ""} {
    ${d.static.map(genStaticProperties).join("\n")}

    ${d.properties.map(genClassProp).join("\n")}

    ${d.constructors.map(genClassConstructor).join("\n")}

    ${d.methods.map(genClassMethod).join("\n")}

    ${d.operators.map(genClassOperator).join("\n")}
  }`;
}

function genClassOperator({ type, rhs, returns }) {
  const returnType = returns ? toType(returns) : "void";

  if (opMapping[type] !== undefined) {
    return `${type}: ${opMapping[type]}<${rhs}, ${returnType}>`;
  }

  console.warn(`op mappping not found: ${type}`);
  return "";
}

function genClassMethod({ name, params, returns }) {
  const returnType = returns ? toType(returns.type) : "void";
  const returnPart = `: ${returnType}`;
  const hasReturnPart = name !== "constructor";

  return `${name}(${genMethodParams(params)}) ${
    hasReturnPart ? returnPart : ""
  };`;
}

function genMethodParams(params) {
  if (params === undefined) return "";

  return params.map(genMethodParam).join(", ");
}

const replParamName = ["default", "with"];
function genMethodParam([name, { type, params }]) {
  if (replParamName.includes(name)) {
    name = `_${name}`;
  }

  if (type === "callable") {
    return genCallable([name, { type, params }]);
  }

  return `${name}: ${toType(type)}`;
}

function genCallable([name, { type, params }]) {
  return `${name}: (${genMethodParams(params)}) => void`;
}

function genClassProp([name, { type, description, readOnly }]) {
  return `${readOnly ? "readonly" : ""} ${name}: ${toType(type)}`;
}

function genStaticProperties([name, { type }]) {
  return `static ${name}: ${type}`;
}

function genClassConstructor({ params }) {
  return genClassMethod({
    name: "constructor",
    params: Object.entries(params || {}),
  });
}

function genEnum({ name, values }) {
  const entries = Object.entries(values);

  return `enum ${name} {
    ${entries.map(([name, { value }]) => `${name}= ${value}`).join(", ")}
  }`;
}

module.exports = {
  genClassMethod,
  genMethodParams,
  genMethodParam,
  genClassProp,
  genClassOperator,
  genStaticProperties,
  genClassConstructor,
  genClass,
  genEnum,
};
