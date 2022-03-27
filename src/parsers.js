function parseHooksFile(yamlData) {}

function parseTypesFile(symbolTable, yamlData) {
  parseClassFile(symbolTable, yamlData);
}

function parseEventsFile(symbolTable, yamlData, globalSymbolTable, ns) {
  console.log("parseEventsFile()");

  let symbolTableEntry = symbolTable["Events"];
  if (!symbolTableEntry) {
    symbolTableEntry = JSON.parse(
      JSON.stringify(globalSymbolTable.shared["Events"])
    );
    symbolTable["Events"] = symbolTableEntry;
  }

  // console.log(symbolTableEntry.methods[0].params);
  // console.log(yamlData);

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
}

function parseLibraryFile(symbolTable, yamlData) {
  parseClassFile(symbolTable, yamlData);
}

function parseClassFile(symbolTable, yamlData) {
  const symbolTableEntry = {
    raw: yamlData,
    name: yamlData.name,
    type: yamlData.type,
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
