import ModuleMethod from "/base/jsonrpc11/ModuleMethod.ts";
import {JSONRPC11Exception} from "/base/jsonrpc11/types.ts";
import {JSONObject, JSONValue} from "/json.ts";
import {ObjectInfo, ObjectSpecification} from "../common.ts";
import {getJSON} from "/lib/utils.ts";
import { GetObjectInfo3Param, GetObjectInfo3Params, GetObjectInfo3Results } from "../get_object_info3/GetObjectInfo3.ts";


// export interface GetObjectInfo3Param {
//     objects: Array<ObjectSpecification>;
//     includeMetadata?: number; // bool
//     ignoreErrors?: number; // bool
// }

export interface AdminsterParam {
    command: string;
    user?: string;
    params: [JSONObject];
}


// yes, incomplete...
export interface WorkspaceIdentity {
    id: number;
}

export interface GetPermissionsMassParams {
    workspaces: Array<WorkspaceIdentity>
}

export type Perms = Record<string, string>;

export interface GetPermissionsMassResult {
    perms: Array<Perms>;
}

export interface ListWorkspaceIDsParams extends JSONObject {
    perm: string;
    excludeGlobal: number;
    onlyGlobal: number;
}

export interface ListWorkspaceIDsResult extends JSONObject {
    workspaces: Array<number>;
    pub: Array<number>;
}

export type ListWorkspaceIDsResults = [ListWorkspaceIDsResult];


export type AdministerParams = [AdminsterParam];

// export interface GetObjectInfo3Result extends JSONObject {
//     infos: Array<ObjectInfo>;
//     paths: Array<Array<string>>;
// }

export type AdministerResults = [JSONValue];

export class Administer extends ModuleMethod<AdministerParams, AdministerResults> {
    validateParams(possibleParams: Array<any>): AdministerParams {
        // if (!isJSONArray(possibleParams)) {
        //     throw new JSONRPC11Exception({
        //         message: 'Invalid params - expected array',
        //         code: -32602,
        //         name: 'JSONRPCError',
        //         error: null
        //     });
        // }
        //
        // if (possibleParams.length !== 0) {
        //     throw new JSONRPC11Exception({
        //         message: 'Invalid params - expected array of length 0',
        //         code: -32602,
        //         name: 'JSONRPCError',
        //         error: null
        //     });
        // }

        return (possibleParams as unknown) as AdministerParams;
    }

    async getPermissionsMass(params: AdministerParams): Promise<GetPermissionsMassResult> {
        // Get the workspaces
        const param = params[0].params[0] as unknown as GetPermissionsMassParams;

        const perms = await Promise.all(param.workspaces.map<Promise<Perms>>(async ({ id }) => {
            const fileName = `workspace_perms_${id}`;
            return (await getJSON(this.dataDir, 'Workspace', fileName)) as unknown as Perms;
        }));
        return {
            perms
        }
    }

    async getObjectInfo(params: GetObjectInfo3Param): Promise<GetPermissionsMassResult> {
        // Get the workspaces
        // const param = [0] as unknown as GetPermissionsMassParams;

        const perms = await Promise.all(params.objects.map<Promise<Perms>>(async ({ ref }) => {
            const [workspaceId, objectId, version] = ref!.split('/');
            const fileName = `object_info_${workspaceId}-${objectId}-${version}`;
            return (await getJSON(this.dataDir, 'Workspace', fileName)) as unknown as Perms;
        }));
        return {
            perms
        }
    }

     async listWorkspaceIDs(user: string, params: ListWorkspaceIDsParams): Promise<ListWorkspaceIDsResult> {
        // Get the workspaces
        // const param = [0] as unknown as GetPermissionsMassParams;
         
        const fileName = `list_workspace_ids_${user}`;
         
        return (await getJSON(this.dataDir, 'Workspace', fileName)) as unknown as ListWorkspaceIDsResult;
     }
    
    userRequired(username?: string) {
        if (typeof username === 'undefined') {
            throw new Error('User is required');
        }
        return username;
    }

    async callFunc(params: AdministerParams): Promise<AdministerResults> {
        switch (params[0].command) {
            case 'listModRequests':
                return await Promise.resolve([[]]);
            case 'getPermissionsMass':
                return this.getPermissionsMass(params) as unknown as Promise<AdministerResults>
            case 'getObjectInfo':
                return this.getObjectInfo(params[0].params[0] as unknown as GetObjectInfo3Param) as unknown as Promise<GetObjectInfo3Results>
            case 'listWorkspaceIDs':
                return this.listWorkspaceIDs(this.userRequired(params[0].user), params[0].params[0] as unknown as ListWorkspaceIDsParams) as unknown as Promise<ListWorkspaceIDsResults>
            default:
                throw new JSONRPC11Exception({
                    message: 'Invalid params - "command" not recognized',
                    code: -32602,
                    name: 'JSONRPCError',
                    error: {
                        command: params[0].command
                    }
                });
        }
    }
}
