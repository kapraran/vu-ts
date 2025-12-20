export interface CustomNetEventParam {
  name: string;
  type: string;
  nullable?: boolean;
  table?: boolean;
}

export interface CustomNetEvent {
  name: string;
  params?: CustomNetEventParam[];
}


