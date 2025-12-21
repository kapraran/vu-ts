export interface CustomEventParam {
  name: string;
  type: string;
  nullable?: boolean;
  table?: boolean;
}

export interface CustomEvent {
  name: string;
  params?: CustomEventParam[];
}

export interface CustomEventsConfig {
  client: CustomEvent[];
  server: CustomEvent[];
  shared: CustomEvent[];
}

