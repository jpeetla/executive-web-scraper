export declare function querySerpApi(companyName: string, query: string): Promise<string[]>;
export declare function findExecutives(companyName: string, titles?: string[]): Promise<{
    name: string;
    title: string;
    linkedin: string;
    company: string;
}[]>;
export declare function queryChat(content: string, url: string): Promise<string>;
