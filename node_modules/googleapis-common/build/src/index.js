"use strict";
// Copyright 2018, Google, LLC.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
var google_auth_library_1 = require("google-auth-library");
exports.OAuth2Client = google_auth_library_1.OAuth2Client;
var apiIndex_1 = require("./apiIndex");
exports.getAPI = apiIndex_1.getAPI;
var apirequest_1 = require("./apirequest");
exports.createAPIRequest = apirequest_1.createAPIRequest;
var authplus_1 = require("./authplus");
exports.AuthPlus = authplus_1.AuthPlus;
var discovery_1 = require("./discovery");
exports.Discovery = discovery_1.Discovery;
var endpoint_1 = require("./endpoint");
exports.Endpoint = endpoint_1.Endpoint;
//# sourceMappingURL=index.js.map