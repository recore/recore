export interface IScope {
  readonly $super?: IScope;
  $get(key: string): any;
  $set(key: string, val: any): void;
  $derive(data: object): IScope;
  [property: string]: any;
}
