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
/// <reference types="node" />
import { Crypto } from '../crypto';
export declare class NodeCrypto implements Crypto {
    sha256DigestBase64(str: string): Promise<string>;
    randomBytesBase64(count: number): string;
    verify(pubkey: string, data: string | Buffer, signature: string): Promise<boolean>;
    sign(privateKey: string, data: string | Buffer): Promise<string>;
    decodeBase64StringUtf8(base64: string): string;
    encodeBase64StringUtf8(text: string): string;
}
