function parseHooksFile(symbolTable, yamlData, globalSymbolTable, ns) {
  // console.log("hooksfile");
  // console.log(yamlData);

  const cname = "Hooks";

  let symbolTableEntry = symbolTable[cname];
  if (!symbolTableEntry) {
    symbolTableEntry = JSON.parse(
      JSON.stringify(globalSymbolTable.shared[cname])
    );
    symbolTable[cname] = symbolTableEntry;
  }

  const __params = [
    ["hook", { type: "HookContext" }],
    ...Object.entries(yamlData.params || {}),
  ];

  symbolTableEntry.methods.push({
    name: "Install",
    params: [
      ["hookName", { type: `"${yamlData.name}"` }],
      ["priority", { type: "number" }],
      ["callback", { type: "callable", params: __params }],
    ],
    returns: { type: "boolean" },
  });

  symbolTableEntry.methods.push({
    name: "Install",
    params: [
      ["hookName", { type: `"${yamlData.name}"` }],
      ["priority", { type: "number" }],
      ["context", { type: "any" }],
      ["callback", { type: "callable", params: __params }],
    ],
    returns: { type: "boolean" },
  });
}

function parseTypesFile(symbolTable, yamlData) {
  return parseClassFile(symbolTable, yamlData);
}

function parseEventsFile(symbolTable, yamlData, globalSymbolTable, ns) {
  let symbolTableEntry = symbolTable["Events"];
  if (!symbolTableEntry) {
    if (globalSymbolTable.shared["Events"].methods[0].name == "Subscribe") {
      globalSymbolTable.shared["Events"].methods =
        globalSymbolTable.shared["Events"].methods.slice(2);
    }

    symbolTableEntry = JSON.parse(
      JSON.stringify(globalSymbolTable.shared["Events"])
    );
    symbolTable["Events"] = symbolTableEntry;
  }

  symbolTableEntry.methods.push({
    name: "Subscribe",
    params: [
      ["eventName", { type: `"${yamlData.name}"` }],
      [
        "callback",
        { type: "callable", params: Object.entries(yamlData.params || {}) },
      ],
    ],
    returns: { type: "Event" },
  });

  symbolTableEntry.methods.push({
    name: "Subscribe<T>",
    params: [
      ["eventName", { type: `"${yamlData.name}"` }],
      ["context", { type: "T" }],
      [
        "callback",
        {
          type: "callable",
          params: [
            ["this", { type: "T" }],
            ...Object.entries(yamlData.params || {}),
          ],
        },
      ],
    ],
    returns: { type: "Event" },
  });

  symbolTableEntry.methods.push({
    name: "Subscribe<T>",
    params: [
      ["eventName", { type: `"${yamlData.name}"` }],
      ["context", { type: "T" }],
      [
        "callback",
        {
          type: "callable",
          params: [
            ["context", { type: "T" }],
            ...Object.entries(yamlData.params || {}),
          ],
        },
      ],
    ],
    returns: { type: "Event" },
  });
}

function parseLibraryFile(symbolTable, yamlData) {
  yamlData.isLibrary = true;
  return parseClassFile(symbolTable, yamlData);
}

function parseClassFile(symbolTable, yamlData) {
  const symbolTableEntry = {
    raw: yamlData,
    name: yamlData.name,
    type: yamlData.type,
    isLibrary: !!yamlData.isLibrary,
    inherits: yamlData.inherits,
    static: Object.entries(yamlData.static || {}),
    properties: Object.entries(yamlData.properties || {}),
    constructors: (yamlData.constructors || []).filter((c) => !!c),
    methods: yamlData.methods || [],
    operators: yamlData.operators || [],
    values: yamlData.values || [],
  };

  symbolTableEntry.methods = symbolTableEntry.methods.map((method) => ({
    ...method,
    params: Object.entries(method.params || {}),
  }));

  symbolTable[symbolTableEntry.name] = symbolTableEntry;
}

module.exports = {
  parseHooksFile,
  parseTypesFile,
  parseEventsFile,
  parseLibraryFile,
};
