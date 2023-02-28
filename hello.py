import yaml
from pathlib import Path
from rich import print
from dataclasses import dataclass
from typing import Dict,Union,List
from collections import defaultdict
from tqdm import tqdm
import pickle
import sys


basedir = Path.cwd() / '.cache' / 'extracted' / 'VU-Docs-master' / 'types'


library = basedir /'shared'/'library'
shared = basedir /'client'/'library'
events = basedir /'client'/'event'
fb = basedir /'fb'

typeID = 1

def type_infer(values):
    type_mapping = {
        str:"string",
        float:"number",
        int:"number",
        bool:"boolean",
    }
    if not (isinstance(values,set) or isinstance(values,list)):
        values = [values]
    return [ type_mapping.get(v,v.__name__) for v in set( type(v) for v in values)]

@dataclass
class VUType:
    id:int
    name:str
    path: List[str]
    fields: Dict[str,Union[str,any]]
    tags: Dict[str,any]



    def __iter__(self):
        return iter([self])

    def for_nikos(self,tabwidth=4):
        lines = ["{"]
        for k,v in self.fields.items():
            typeinfo = v.for_nikos(tabwidth*2) if isinstance(v,VUType) else ["|".join(type_infer(v))]
            newline='\n'
            lines.append(f'{" "*tabwidth*2}{k}:{newline.join(typeinfo)},')
        lines.append(" "*tabwidth+"}")
        return lines


vutypes:Dict[int,VUType] = {}


def keys_compare(a,b):
    return list(a.keys()) == list(b.keys())

def merge_types(t:VUType):
    global vutypes
    for existing in vutypes.values():
        if t.path == existing.path:
            if keys_compare(t.fields,existing.fields):
                # print('same type')
                return existing
            unique_keys = set(t.fields.keys()) - set(existing.fields.keys())
            existing.fields.update( { k:v for k,v in t.fields.items() if k in unique_keys})
            # print(existing)
            return existing
    return t


def type_parser(src,path:List[str],indent=0,**kwargs):
    global typeID
    if isinstance(src,dict):
        fields = {}
        for k,v in src.items():
            # print('\t'*indent, k)
            if isinstance(v,dict) | isinstance(v,list):
                fields[k] = type_parser(v,path + [k],indent+1,**kwargs)
                # print(fields[k])
            else:
                fields[k] = v

        t = VUType(typeID,name=".".join(path),path=path,fields=fields,tags=kwargs)
        typeID+=1
        t=merge_types(t)
        vutypes[t.id] = t
        return t
    if isinstance(src,list):
        return {"_list" : [type_parser(v,path,indent+1,**kwargs) for v in src]}


def find_type(typename:str):
    res = []
    join_fields = False
    if typename.endswith('*'):
        join_fields = True
        typename = typename[:-1].strip('.')
    for v in vutypes.values():
        if v.name != typename:
            continue
        if join_fields:
            fields = defaultdict(set)
            t:VUType
            for name,value in v.fields.items():
                for iname,ivalue in value.fields.items():
                    fields[iname].add(ivalue)
            v.fields = dict(fields)
        res.append(v)
    return res

def inspect_folder(folder:Path):
    files = list(folder.glob('*'))
    if not files:
        raise ValueError('No files found gamwto')
    for file in tqdm(files):
        if file.is_dir():
            continue

        with file.open() as f:
            yaml_data = yaml.safe_load(f)
            type_parser(yaml_data,['_'],0,filename=file.name)
    with open('.cachefile','wb') as w:
        pickle.dump(vutypes,w)
    
name = sys.argv[2] if len(sys.argv) > 2 else 'unnamed'
use_cache = len(sys.argv) > 3

if use_cache and Path('.cachefile').exists():
    with open('.cachefile','rb') as w:
        vutypes = pickle.load(w)
else:
    inspect_folder(fb)
results = find_type(sys.argv[1])


# print([ v.name for v in vutypes.values()])
for res in results:
    print(f"declare interface {name}")
    print(*res.for_nikos(),sep='\n')
