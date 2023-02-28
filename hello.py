import yaml
from pathlib import Path
from rich import print
from dataclasses import dataclass
from typing import Dict, Union, List
from collections import defaultdict
from tqdm import tqdm
from itertools import chain
import pickle
import sys


basedir = Path.cwd() / ".cache" / "extracted" / "VU-Docs-master" / "types"


def _type_infer(values):
    type_mapping = {
        str: "string",
        float: "number",
        int: "number",
        bool: "boolean",
    }
    if not (isinstance(values, set) or isinstance(values, list)):
        values = [values]
    return [type_mapping.get(v, v.__name__) for v in set(type(v) for v in values)]


def _keys_compare(a, b):
    return list(a.keys()) == list(b.keys())


@dataclass
class VUType:
    id: int
    name: str
    path: List[str]
    fields: Dict[str, Union[str, any]]
    tags: Dict[str, any]

    def __iter__(self):
        return iter([self])

    def for_nikos(self, tabwidth=4):
        lines = ["{"]
        for k, v in self.fields.items():
            if not isinstance(v, list):
                typeinfo = (
                    v.for_nikos(tabwidth + 2)
                    if isinstance(v, VUType)
                    else ["|".join(_type_infer(v))]
                )
                typeinfo = "\n".join(typeinfo)
            else:
                typeinfo = chain(*[
                    sv.for_nikos(tabwidth + 2)
                    if isinstance(sv, VUType)
                    else ["|".join(_type_infer(sv))]
                    for sv in v
                ])
                typeinfo = "[" + "\n".join(typeinfo) + "]"

            lines.append(f'{" "*(tabwidth+2)}{k}:{typeinfo},')
        lines.append(" " * tabwidth + "}")
        return lines


class ParserThsPoutsas:
    types: Dict[int, VUType]
    typeID: int
    cachefile: str

    def __init__(self, cachefile=None):
        self.cachefile = cachefile
        self.types = {}
        self.typeID = 0

    def _type_parser(self, src, path: List[str], indent=0, **kwargs):
        t = VUType(self.typeID, name=".".join(path), path=path, fields={}, tags=kwargs)
        self.typeID += 1
        fields = {}
        if isinstance(src, dict):
            for k, v in src.items():
                if isinstance(v, dict) | isinstance(v, list):
                    fields[k] = self._type_parser(v, path + [k], indent + 1, **kwargs)
                else:
                    fields[k] = v
        if isinstance(src, list):
            fields = {
                i:self._type_parser(v, path+[str(i)], indent + 1, **kwargs) for i,v in enumerate(src)
            }
            # print(fields)
        t.fields = fields
        t = self._merge_types(t)
        self.types[t.id] = t
        return t

    def _merge_types(self, t: VUType):
        for existing in self.types.values():
            if t.path == existing.path:
                if _keys_compare(t.fields, existing.fields):
                    # print('same type')
                    return existing
                unique_keys = set(t.fields.keys()) - set(existing.fields.keys())
                existing.fields.update(
                    {k: v for k, v in t.fields.items() if k in unique_keys}
                )
                # print(existing)
                return existing
        return t

    def load(self, folder):
        files = list(folder.glob("*"))
        if not files:
            raise ValueError("No files found gamwto")
        for file in tqdm(files):
            if file.is_dir():
                continue
            with file.open() as f:
                yaml_data = yaml.safe_load(f)
                self._type_parser(yaml_data, ["_"], 0, filename=file.absolute())
        if self.cachefile:
            with open(".cachefile", "wb") as w:
                pickle.dump(self.vutypes, w)

    def find_type(self, typename: str):
        res = []
        join_fields = False
        if typename.endswith("*"):
            join_fields = True
            typename = typename[:-1].strip(".")
        for v in self.types.values():
            if v.name != typename:
                continue
            if join_fields:
                fields = defaultdict(set)
                t: VUType
                for name, value in v.fields.items():
                    if isinstance(value,VUType):
                        for iname, ivalue in value.fields.items():
                            if isinstance(ivalue,VUType):
                                fields[iname].add(ivalue.id)
                            else:
                                fields[iname].add(ivalue)
                    else:
                        fields[name].add(value)

                v.fields = dict(fields)
            res.append(v)
        return res


library = basedir / "shared" / "library"
shared = basedir / "client" / "library"
events = basedir / "client" / "event"
fb = basedir / "fb"

# name = sys.argv[2] if len(sys.argv) > 2 else 'unnamed'
# use_cache = len(sys.argv) > 3

# if use_cache and Path('.cachefile').exists():
#     with open('.cachefile','rb') as w:
#         vutypes = pickle.load(w)
# else:
#     inspect_folder(fb)
# results = find_type(sys.argv[1])

queries = {("_.methods.0.returns.*", "name"): [shared,library]}

parser = ParserThsPoutsas()
for (query, name), paths in queries.items():
    for p in paths:
        parser.load(p)
    # with open('kahmenofile.txt','w') as f:
    #     print(parser.types,file=f)
    results = parser.find_type(query)
    print(parser.types, file=open("dumpme.txt", "w"))
    for res in results:
        print(f"declare interface {name}")
        print(*res.for_nikos(), sep="\n")


# print([ v.name for v in vutypes.values()])
