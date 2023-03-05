class VUParam {
  name: string;
  type: string;
  description?: string;
}

class VUReturn {
  type: string;
  nullable?: boolean;
  array?: boolean;
  table?: boolean;
  description?: string;
}

class VUMethod {
  name: string;
  description?: string;
  returns: VUReturn[];
  params: VUParam[];
}

export default class VUClass {
  name: string;
  type: string;
  methods: VUMethod[];

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
    this.methods = [];
  }
}
