/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/// <reference types="node" />
import * as stream from 'stream';
import { JWTInput } from './credentials';
import { GetTokenResponse, OAuth2Client, RefreshOptions } from './oauth2client';
export interface UserRefreshClientOptions extends RefreshOptions {
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
}
export declare class UserRefreshClient extends OAuth2Client {
    _refreshToken?: string | null;
    /**
     * User Refresh Token credentials.
     *
     * @param clientId The authentication client ID.
     * @param clientSecret The authentication client secret.
     * @param refreshToken The authentication refresh token.
     */
    constructor(clientId?: string, clientSecret?: string, refreshToken?: string);
    constructor(options: UserRefreshClientOptions);
    constructor(clientId?: string, clientSecret?: string, refreshToken?: string);
    /**
     * Refreshes the access token.
     * @param refreshToken An ignored refreshToken..
     * @param callback Optional callback.
     */
    protected refreshTokenNoCache(refreshToken?: string | null): Promise<GetTokenResponse>;
    /**
     * Create a UserRefreshClient credentials instance using the given input
     * options.
     * @param json The input object.
     */
    fromJSON(json: JWTInput): void;
    /**
     * Create a UserRefreshClient credentials instance using the given input
     * stream.
     * @param inputStream The input stream.
     * @param callback Optional callback.
     */
    fromStream(inputStream: stream.Readable): Promise<void>;
    fromStream(inputStream: stream.Readable, callback: (err?: Error) => void): void;
    private fromStreamAsync;
}
