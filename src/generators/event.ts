import { CleanEventFile } from "../parsers/event";

export default function (data: CleanEventFile) {
  const params = [
    {
      name: "ctx",
      type: "T",
      nullable: false,
    },
    ...data.params,
  ];

  const paramsStr = params.map(
    (param) => `${param.name}: ${param.type} ${param.nullable ? "| null" : ""}`
  );

  return `

    declare namespace Event {
      function Subscribe(eventName: "${data.name}",callback: (${paramsStr
    .slice(1)
    .join(",")}) => void)
      function Subscribe<T>(eventName: "${
        data.name
      }", ctx: T, callback:(${paramsStr.join(",")}) => void)
    }
  
  `;
}
