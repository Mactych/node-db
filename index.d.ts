export class Database {
  constructor(authorization?: string, url?: string);
  public request(options: {path: string, method: string, headers?: object}, data?: any);
  public get(key: string, options?: { raw?: boolean }): Promise<unknown>;
  public set(key: string, data: any): Promise<string>;
  public delete(key: string): Promise<string>;
  public list(key?: string): Promise<string[]>;
}