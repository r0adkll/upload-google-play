/**
 * Copyright 2013 Google Inc. All Rights Reserved.
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
import { GaxiosError } from 'gaxios';
import { GetTokenResponse, OAuth2Client, RefreshOptions } from './oauth2client';
export interface ComputeOptions extends RefreshOptions {
    /**
     * The service account email to use, or 'default'. A Compute Engine instance
     * may have multiple service accounts.
     */
    serviceAccountEmail?: string;
    /**
     * The scopes that will be requested when acquiring service account
     * credentials. Only applicable to modern App Engine and Cloud Function
     * runtimes as of March 2019.
     */
    scopes?: string | string[];
}
export declare class Compute extends OAuth2Client {
    private serviceAccountEmail;
    scopes: string[];
    /**
     * Google Compute Engine service account credentials.
     *
     * Retrieve access token from the metadata server.
     * See: https://developers.google.com/compute/docs/authentication
     */
    constructor(options?: ComputeOptions);
    /**
     * Indicates whether the credential requires scopes to be created by calling
     * createdScoped before use.
     * @deprecated
     * @return Boolean indicating if scope is required.
     */
    createScopedRequired(): boolean;
    /**
     * Refreshes the access token.
     * @param refreshToken Unused parameter
     */
    protected refreshTokenNoCache(refreshToken?: string | null): Promise<GetTokenResponse>;
    protected wrapError(e: GaxiosError): void;
}
