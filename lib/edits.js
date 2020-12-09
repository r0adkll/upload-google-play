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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
exports.uploadToPlayStore = void 0;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const fs_1 = require("fs");
const googleapis_1 = require("googleapis");
const whatsnew_1 = require("./whatsnew");
const androidPublisher = googleapis_1.google.androidpublisher('v3');
function uploadToPlayStore(options, releaseFiles) {
    return __awaiter(this, void 0, void 0, function* () {
        // Check the 'track' for 'internalsharing', if so switch to a non-track api
        if (options.track === 'internalsharing') {
            core.debug("Track is Internal app sharing, switch to special upload api");
            for (const releaseFile of releaseFiles) {
                core.debug(`Uploading ${releaseFile}`);
                yield uploadInternalSharingRelease(options, releaseFile).catch(reason => {
                    core.setFailed(reason);
                    return Promise.reject(reason);
                });
            }
        }
        else {
            // Create a new Edit
            const appEdit = yield androidPublisher.edits.insert({
                auth: options.auth,
                packageName: options.applicationId
            });
            // Validate the given track
            yield validateSelectedTrack(appEdit.data, options).catch(reason => {
                core.setFailed(reason);
                return Promise.reject(reason);
            });
            // Upload artifacts to Google Play, and store their version codes
            var versionCodes = new Array();
            for (const releaseFile of releaseFiles) {
                core.debug(`Uploading ${releaseFile}`);
                const versionCode = yield uploadRelease(appEdit.data, options, releaseFile).catch(reason => {
                    core.setFailed(reason);
                    return Promise.reject(reason);
                });
                versionCodes.push(versionCode);
            }
            // Add the uploaded artifacts to the Edit track
            const track = yield addReleasesToTrack(appEdit.data, options, versionCodes);
            // Commit the pending Edit
            const res = yield androidPublisher.edits.commit({
                auth: options.auth,
                editId: appEdit.data.id,
                packageName: options.applicationId
            });
            // Simple check to see whether commit was successful
            if (res.data.id != null) {
                core.debug(`Successfully committed ${res.data.id}`);
                const name = options.name || (yield getPublishedReleaseName(res.data, options));
                core.setOutput("releaseName", name);
                return Promise.resolve(res.data.id);
            }
            else {
                core.setFailed(`Error ${res.status}: ${res.statusText}`);
                return Promise.reject(res.status);
            }
        }
    });
}
exports.uploadToPlayStore = uploadToPlayStore;
function uploadInternalSharingRelease(options, releaseFile) {
    return __awaiter(this, void 0, void 0, function* () {
        if (releaseFile.endsWith('.apk')) {
            const res = yield internalSharingUploadApk(options, releaseFile);
            console.log(`${releaseFile} uploaded to Internal Sharing, download it with ${res.downloadUrl}`);
            return Promise.resolve(res.downloadUrl);
        }
        else if (releaseFile.endsWith('.aab')) {
            const res = yield internalSharingUploadBundle(options, releaseFile);
            console.log(`${releaseFile} uploaded to Internal Sharing, download it with ${res.downloadUrl}`);
            return Promise.resolve(res.downloadUrl);
        }
        else {
            return Promise.reject(`${releaseFile} is invalid`);
        }
    });
}
function uploadRelease(appEdit, options, releaseFile) {
    return __awaiter(this, void 0, void 0, function* () {
        if (releaseFile.endsWith('.apk')) {
            const apk = yield uploadApk(appEdit, options, releaseFile);
            yield uploadMappingFile(appEdit, apk.versionCode, options);
            return Promise.resolve(apk.versionCode);
        }
        else if (releaseFile.endsWith('.aab')) {
            const bundle = yield uploadBundle(appEdit, options, releaseFile);
            yield uploadMappingFile(appEdit, bundle.versionCode, options);
            return Promise.resolve(bundle.versionCode);
        }
        else {
            return Promise.reject(`${releaseFile} is invalid`);
        }
    });
}
function validateSelectedTrack(appEdit, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield androidPublisher.edits.tracks.list({
            auth: options.auth,
            editId: appEdit.id,
            packageName: options.applicationId
        });
        const allTracks = res.data.tracks;
        if (allTracks == undefined || allTracks.find(value => value.track == options.track) == undefined) {
            return Promise.reject(`Track "${options.track}" could not be found `);
        }
    });
}
function addReleasesToTrack(appEdit, options, versionCodes) {
    return __awaiter(this, void 0, void 0, function* () {
        let status;
        if (options.userFraction != undefined) {
            status = 'inProgress';
        }
        else {
            status = 'completed';
        }
        core.debug(`Creating Track Release for Edit(${appEdit.id}) for Track(${options.track}) with a UserFraction(${options.userFraction}) and VersionCodes(${versionCodes})`);
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
                        name: options.name,
                        userFraction: options.userFraction,
                        status: status,
                        inAppUpdatePriority: options.inAppUpdatePriority,
                        releaseNotes: yield whatsnew_1.readLocalizedReleaseNotes(options.whatsNewDir),
                        versionCodes: versionCodes.filter(x => x != 0).map(x => x.toString())
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
function getPublishedReleaseName(appEdit, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const track = yield androidPublisher.edits.tracks.get({
            editId: appEdit.id,
            track: options.track,
            packageName: options.applicationId
        });
        const release = track.data.releases[0]; // We only ever create one release, so grab the first one
        return release.name;
    });
}
