"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRelease = void 0;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const fs_1 = require("fs");
const googleapis_1 = require("googleapis");
const whatsnew_1 = require("./whatsnew");
const androidPublisher = googleapis_1.google.androidpublisher('v3');
function uploadRelease(options, releaseFiles) {
    return __awaiter(this, void 0, void 0, function* () {
        // Check the 'track' for 'internalsharing', if so switch to a non-track api
        if (options.track === 'internalsharing') {
            core.debug("Track is Internal app sharing, switch to special upload api");
            releaseFiles.forEach((releaseFile) => __awaiter(this, void 0, void 0, function* () {
                // if (releaseFile.endsWith('.apk')) {
                //     const res = await internalSharingUploadApk(options, releaseFile)
                //     return Promise.resolve(res.downloadUrl)
                // } else if (releaseFile.endsWith('.aab')) {
                //     const res = await internalSharingUploadBundle(options, releaseFile)
                //     return Promise.resolve(res.downloadUrl)
                // } else {
                //     return Promise.reject(`Unrecognized Release File`)
                // }
            }));
        }
        const appEdit = yield androidPublisher.edits.insert({
            auth: options.auth,
            packageName: options.applicationId
        });
        const allTracks = yield getAllTracks(appEdit.data, options);
        if (allTracks == undefined || allTracks.find(value => value.track == options.track) == undefined) {
            core.setFailed(`Track "${options.track}" could not be found `);
            return Promise.reject(`No track found for "${options.track}"`);
        }
        let track = undefined;
        releaseFiles.forEach((releaseFile) => __awaiter(this, void 0, void 0, function* () {
            if (releaseFile.endsWith('.apk')) {
                const apk = yield uploadApk(appEdit.data, options, releaseFile);
                yield uploadMappingFile(appEdit.data, apk.versionCode, options);
                track = yield trackVersionCode(appEdit.data, options, apk.versionCode);
            }
            else if (releaseFile.endsWith('.aab')) {
                const bundle = yield uploadBundle(appEdit.data, options, releaseFile);
                yield uploadMappingFile(appEdit.data, bundle.versionCode, options);
                track = yield trackVersionCode(appEdit.data, options, bundle.versionCode);
            }
            else {
                return Promise.reject("Invalid release file");
            }
        }));
        if (track != undefined) {
            const res = yield androidPublisher.edits.commit({
                auth: options.auth,
                editId: appEdit.data.id,
                packageName: options.applicationId
            });
            core.debug(`Committed release with Id(${res.data.id}) and Track: ${track}`);
        }
    });
}
exports.uploadRelease = uploadRelease;
function getAllTracks(appEdit, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield androidPublisher.edits.tracks.list({
            auth: options.auth,
            editId: appEdit.id,
            packageName: options.applicationId
        });
        return res.data.tracks;
    });
}
function trackVersionCode(appEdit, options, versionCode) {
    return __awaiter(this, void 0, void 0, function* () {
        let status;
        if (options.userFraction != undefined) {
            status = 'inProgress';
        }
        else {
            status = 'completed';
        }
        core.debug(`Creating Track Release for Edit(${appEdit.id}) for Track(${options.track}) with a UserFraction(${options.userFraction}) and VersionCode(${versionCode})`);
        const res = yield androidPublisher.edits.tracks
            .update({
            auth: options.auth,
            editId: appEdit.id,
            packageName: options.applicationId,
            track: options.track,
            requestBody: {
                track: options.track,
                releases: [
                    {
                        userFraction: options.userFraction,
                        status: status,
                        releaseNotes: yield whatsnew_1.readLocalizedReleaseNotes(options.whatsNewDir),
                        versionCodes: [
                            versionCode.toString()
                        ]
                    }
                ]
            }
        });
        return res.data;
    });
}
function uploadMappingFile(appEdit, versionCode, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (options.mappingFile != undefined && options.mappingFile.length > 0) {
            const mapping = fs_1.readFileSync(options.mappingFile, 'utf-8');
            if (mapping != undefined) {
                core.debug(`[${appEdit.id}, versionCode=${versionCode}, packageName=${options.applicationId}]: Uploading Proguard mapping file @ ${options.mappingFile}`);
                yield androidPublisher.edits.deobfuscationfiles.upload({
                    auth: options.auth,
                    packageName: options.applicationId,
                    editId: appEdit.id,
                    apkVersionCode: versionCode,
                    deobfuscationFileType: 'proguard',
                    media: {
                        mimeType: 'application/octet-stream',
                        body: fs.createReadStream(options.mappingFile)
                    }
                });
            }
        }
    });
}
function internalSharingUploadApk(options, apkReleaseFile) {
    return __awaiter(this, void 0, void 0, function* () {
        core.debug(`[packageName=${options.applicationId}]: Uploading Internal Sharing APK @ ${apkReleaseFile}`);
        const res = yield androidPublisher.internalappsharingartifacts.uploadapk({
            auth: options.auth,
            packageName: options.applicationId,
            media: {
                mimeType: 'application/vnd.android.package-archive',
                body: fs.createReadStream(apkReleaseFile)
            }
        });
        return res.data;
    });
}
function internalSharingUploadBundle(options, bundleReleaseFile) {
    return __awaiter(this, void 0, void 0, function* () {
        core.debug(`[packageName=${options.applicationId}]: Uploading Internal Sharing Bundle @ ${bundleReleaseFile}`);
        const res = yield androidPublisher.internalappsharingartifacts.uploadbundle({
            auth: options.auth,
            packageName: options.applicationId,
            media: {
                mimeType: 'application/octet-stream',
                body: fs.createReadStream(bundleReleaseFile)
            }
        });
        return res.data;
    });
}
function uploadApk(appEdit, options, apkReleaseFile) {
    return __awaiter(this, void 0, void 0, function* () {
        core.debug(`[${appEdit.id}, packageName=${options.applicationId}]: Uploading APK @ ${apkReleaseFile}`);
        const res = yield androidPublisher.edits.apks.upload({
            auth: options.auth,
            packageName: options.applicationId,
            editId: appEdit.id,
            media: {
                mimeType: 'application/vnd.android.package-archive',
                body: fs.createReadStream(apkReleaseFile)
            }
        });
        return res.data;
    });
}
function uploadBundle(appEdit, options, bundleReleaseFile) {
    return __awaiter(this, void 0, void 0, function* () {
        core.debug(`[${appEdit.id}, packageName=${options.applicationId}]: Uploading App Bundle @ ${bundleReleaseFile}`);
        const res = yield androidPublisher.edits.bundles.upload({
            auth: options.auth,
            packageName: options.applicationId,
            editId: appEdit.id,
            media: {
                mimeType: 'application/octet-stream',
                body: fs.createReadStream(bundleReleaseFile)
            }
        });
        return res.data;
    });
}
