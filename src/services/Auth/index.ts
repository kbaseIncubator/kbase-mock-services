import { getJSON } from '../../lib/utils.ts';
import { RESTHandler, RESTHandleProps, NotFoundError, AppError } from '/base/RESTHandler.ts';
import { JSONObject, JSONValue } from '/json.ts';

export interface RESTPathHandlerProps {
    dataDir: string;
    path: string;
    query: { [key: string]: string };
    token: string | null;
    body: JSONValue;
}

export abstract class RESTPathHandler {
    dataDir: string;
    path: string;
    query: { [key: string]: string };
    token: string | null;
    body: JSONValue;
    constructor({ dataDir, path, query, token, body }: RESTPathHandlerProps) {
        this.dataDir = dataDir;
        this.path = path;
        this.query = query;
        this.token = token;
        this.body = body;
    }
    abstract run(): Promise<JSONValue>;
    requireToken() {
        if (this.token === null) {
            throw new AppError('No authentication token', 10010, 400, 'Bad Request');
        }
        if (!/^[A-Z0-9]{32}$/.test(this.token)) {
            throw new AppError('Invalid token', 10020, 401, 'Unauthorized');
        }
    }
    validateUsername(username: string) {
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(username)) {
            throw new AppError('Illegal user name', 30010, 400, 'Bad Request');
        }
    }
}

export class HandleGETMe extends RESTPathHandler {
    async run() {
        this.requireToken();
        const fileName = `me_${this.token}`;
        const data = (await getJSON(this.dataDir, 'Auth', fileName)) as unknown as JSONValue;
        return data;
    }
}

export class HandleGETUsers extends RESTPathHandler {
    async run() {
        this.requireToken();
        const usernames = this.query.list.split(',');
        const users: { [key: string]: JSONValue } = {};
        for (const username of usernames) {
            if (username.length === 0) {
                continue;
            }
            this.validateUsername(username);
            const filename = `user_${username}`;
            try {
                const userDisplayName = await getJSON(this.dataDir, 'Auth', filename);
                users[username] = userDisplayName;
            } catch (ex) {
                // ignore
                console.warn(`Ignoring missing user ${username}: ${ex.message}`);
            }
        }

        return users;
    }
}

export interface LegacyLoginRequest extends JSONObject {
    token: string,
    fields: Array<string>;
}

/**
 * Note that the legacy endpoint, according to the auth docs, only supports
 * returning "user_id".
 */
export class HandleLegacyLogin extends RESTPathHandler {
    async run() {
        // TODO: make the rest handler generic.
        // if (!request.body) {
        //     this.errorEmptyBody();
        // }
        const requestBody = this.body as JSONObject;
        
        const token = requestBody['token']
        const fileName = `legacy_${token}`;
        const data = (await getJSON(this.dataDir, 'Auth', fileName)) as unknown as JSONObject;
        return data;
    }
}



export class AuthServiceHandler extends RESTHandler {
    getHandler({ method, path, query, token, body }: RESTHandleProps): RESTPathHandler | null {
       
        switch (method) {
            case 'GET':
                switch (path) {
                    case 'api/V2/me':
                        return new HandleGETMe({ dataDir: this.dataDir, path, query, token, body });
                    case 'api/V2/users':
                        return new HandleGETUsers({ dataDir: this.dataDir, path, query, token, body });
                    default:
                        return null;
                }
            case 'POST':
                switch (path) {
                    case 'api/legacy/KBase/Sessions/Login':
                        return new HandleLegacyLogin({dataDir: this.dataDir, path, query, token, body})
                    default:
                        return null;
                }
            default:
                return null;
        }
    }

    handle({ method, path, query, token, body }: RESTHandleProps): Promise<JSONValue> {
        const handler = this.getHandler({ method, path, query, token, body });

        if (!handler) {
            throw new NotFoundError('HTTP 404 Not Found');
        }
        return handler.run();
    }
}
