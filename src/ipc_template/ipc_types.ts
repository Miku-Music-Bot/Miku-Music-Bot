type JSONAbleBasic = string | number | boolean;
export type JSONAble = JSONAbleBasic | { [key: string | number]: JSONAble } | Array<JSONAble>;

export type FunctionRequest<FunctionNames> = {
  uid: string;
  function_type: FunctionNames;
  args: string;
};

export type FunctionResponse = {
  uid: string;
  success: boolean;
  error?: string;
  result: string;
};
