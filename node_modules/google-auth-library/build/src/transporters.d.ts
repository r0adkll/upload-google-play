/**
 * Copyright 2019 Google LLC. All Rights Reserved.
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
import { GaxiosError, GaxiosOptions, GaxiosPromise, GaxiosResponse } from 'gaxios';
export interface Transporter {
    request<T>(opts: GaxiosOptions): GaxiosPromise<T>;
    request<T>(opts: GaxiosOptions, callback?: BodyResponseCallback<T>): void;
    request<T>(opts: GaxiosOptions, callback?: BodyResponseCallback<T>): GaxiosPromise | void;
}
export interface BodyResponseCallback<T> {
    (err: Error | null, res?: GaxiosResponse<T> | null): void;
}
export interface RequestError extends GaxiosError {
    errors: Error[];
}
export declare class DefaultTransporter {
    /**
     * Default user agent.
     */
    static readonly USER_AGENT: string;
    /**
     * Configures request options before making a request.
     * @param opts GaxiosOptions options.
     * @return Configured options.
     */
    configure(opts?: GaxiosOptions): GaxiosOptions;
    /**
     * Makes a request using Gaxios with given options.
     * @param opts GaxiosOptions options.
     * @param callback optional callback that contains GaxiosResponse object.
     * @return GaxiosPromise, assuming no callback is passed.
     */
    request<T>(opts: GaxiosOptions): GaxiosPromise<T>;
    request<T>(opts: GaxiosOptions, callback?: BodyResponseCallback<T>): void;
    /**
     * Changes the error to include details from the body.
     */
    private processError;
}
