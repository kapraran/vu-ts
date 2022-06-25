class Counter {
  private diff: string[];
  private hasNew: boolean;

  constructor() {
    this.diff = [];
  }

  append(newItems: string | string[]) {
    if (typeof newItems === "string") {
      newItems = [newItems];
    }

    const prev = this.diff.length;
    this.diff = Array.from(new Set([...this.diff, ...newItems]));

    this.hasNew = this.diff.length !== prev;
  }

  hasNewStuff() {
    if (this.hasNew) {
      this.hasNew = false;
      return true;
    }

    return false;
  }

  logIfNewStuff() {
    if (this.hasNewStuff()) console.log(this.diff);
  }
}

// done
type Prop = {
  type: string;
  description?: string;
  readOnly?: boolean;
  readonly?: boolean;
  nullable?: boolean;
  array?: boolean;
  table?: boolean;
  nestedTable?: boolean;
};

export type ExtProp = Omit<Prop & { name: string }, "readonly">;

// done
type ReturnType = {
  type: string;
  description?: string;
  table?: boolean;
  nullable?: boolean;
};

// done
type Param = {
  type: string;
  description?: string;
  default?: any;
  nullable?: boolean;
  table?: boolean;
  variadic?: boolean;
};

export type ExtParam = Param & { name: string };

// done
export type Constructor = {
  params?: Record<string, Param>;
  description?: string;
};

// done
type Method = {
  name: string;
  description?: string;
  params?: Record<string, Param>;
  returns?: ReturnType | ReturnType[];
};

type CleanMethod = {
  name: string;
  description?: string;
  params: ExtParam[];
  returns: ReturnType[];
};

// done
export type ValueType = {
  value: number;
  description?: string;
};

export type ExtValueType = ValueType & { name: string };

// done
type OperatorType = {
  type: string;
  rhs: string;
  returns: string;
};

export type YamlData = {
  name: string; // done
  type: string; // done
  description?: string; // done
  inherits?: string; // done
  constructors?: (Constructor | null)[]; // done
  properties?: Record<string, Prop>; // done
  methods?: Method[]; // done
  static?: Record<string, Param>; // done
  operators?: OperatorType[]; // done
  values?: Record<string, ValueType>; // done
};

export type CleanYamlData = {
  name: string; // gen
  type: string;
  description?: string; // gen
  inherits?: string; // gen
  constructors: Constructor[];
  properties: ExtProp[];
  static: ExtParam[];
  operators: OperatorType[];
  values: ExtValueType[]; // gen
  methods: CleanMethod[];
};

export function parseHooksFile() {}

export function parseEventsFile() {}

const cc = new Counter();

export function parseTypeFile(data: YamlData): CleanYamlData {
  const constructors = (data.constructors || []).filter(
    (c) => c == null
  ) as Constructor[];

  const properties = Object.entries(data.properties || {}).map<ExtProp>(
    ([name, prop]) => {
      return {
        name,
        ...prop,
        readOnly: prop.readOnly || prop.readonly || false,
      };
    }
  );

  const values = Object.entries(data.values || {}).map<ExtValueType>(
    ([name, value]) => {
      return {
        name,
        ...value,
      };
    }
  );

  const _static = Object.entries(data.static || {}).map<ExtParam>(
    ([name, value]) => {
      return {
        name,
        ...value,
      };
    }
  );

  const methods = (data.methods || []).map<CleanMethod>((m) => {
    const returns = (Array.isArray(m.returns) ? m.returns : [m.returns]).filter(
      (s) => !!s
    ) as ReturnType[];

    const params = Object.entries(m.params || {}).map<ExtParam>(
      ([name, value]) => {
        return {
          name,
          ...value,
        };
      }
    );

    return {
      name: m.name,
      description: m.description,
      params,
      returns,
    };
  });

  return {
    name: data.name,
    type: data.type,
    description: data.description,
    inherits: data.inherits,
    constructors,
    properties,
    operators: data.operators || [],
    values,
    static: _static,
    methods,
  };

  // if (data.properties) {
  //   Object.values(data.properties).forEach((s) => {
  //     cc.append(Object.keys(s));
  //     cc.logIfNewStuff();
  //   });
  // }

  // console.log("constructors:");
  data.constructors?.forEach((c) => {
    if (c === null) return;
    // Object.values(c.params || {}).forEach((c) => console.log(c.type));
  });

  // console.log("properties:");
  Object.values(data.properties || {}).forEach((t) => {
    // console.log(t.type);
    // console.log(t.readOnly);
    // propKeys = [...propKeys, ...Object.keys(t)];
    // const s = new Set(propKeys);
    // if (s.size !== lastNum) {
    //   lastNum = s.size;
    //   console.log(new Set(propKeys));
    // }
    // if (t.description) {
    //   console.log("description:");
    //   console.log(t.description);
    // }
  });

  // console.log("methods:");
  Object.values(data.methods || {}).forEach((m) => {
    // console.log(m.name);
    // console.log(m.params);
  });

  // console.log("static:");
  Object.values(data.static || {}).forEach((s) => {
    // console.log(s.type);
  });
}

export function parseLibraryFile() {}
