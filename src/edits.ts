import * as core from '@actions/core';
import * as fs from "fs";
import {readFileSync} from "fs";

import {google} from 'googleapis';
import {androidpublisher_v3} from "googleapis";

import AndroidPublisher = androidpublisher_v3.Androidpublisher;
import AppEdit = androidpublisher_v3.Schema$AppEdit;
import Apk = androidpublisher_v3.Schema$Apk;
import Bundle = androidpublisher_v3.Schema$Bundle;
import Track = androidpublisher_v3.Schema$Track;
import InternalAppSharingArtifact = androidpublisher_v3.Schema$InternalAppSharingArtifact;
import {Compute} from "google-auth-library/build/src/auth/computeclient";
import {JWT} from "google-auth-library/build/src/auth/jwtclient";
import {UserRefreshClient} from "google-auth-library/build/src/auth/refreshclient";
import {readLocalizedReleaseNotes} from "./whatsnew";

const androidPublisher: AndroidPublisher = google.androidpublisher('v3');

export interface EditOptions {
    auth: Compute | JWT | UserRefreshClient;
    applicationId: string;
    track: string;
    inAppUpdatePriority: number;
    userFraction?: number;
    whatsNewDir?: string;
    mappingFile?: string;
    name?: string;
}

export async function uploadToPlayStore(options: EditOptions, releaseFiles: string[]): Promise<string | undefined> {
    // Check the 'track' for 'internalsharing', if so switch to a non-track api
    if (options.track === 'internalsharing') {
        core.debug("Track is Internal app sharing, switch to special upload api")
        let downloadUrls: string[] = []
        for (const releaseFile of releaseFiles) {
            core.debug(`Uploading ${releaseFile}`);
            await uploadInternalSharingRelease(options, releaseFile)
                .then(downloadUrl => {
                    downloadUrls.push(downloadUrl as string)
                })
                .catch(reason => {
                    core.setFailed(reason);
                    return Promise.reject(reason);
                });
        }
        core.setOutput("internalSharingDownloadUrls", downloadUrls);
        core.exportVariable("INTERNAL_SHARING_DOWNLOAD_URLS", downloadUrls);
    } else {
        // Create a new Edit
        core.info(`Creating a new Edit for this release`)
        const appEdit = await androidPublisher.edits.insert({
            auth: options.auth,
            packageName: options.applicationId
        });

        // Validate the given track
        core.info(`Validating track '${options.track}'`)
        await validateSelectedTrack(appEdit.data, options).catch(reason => {
            core.setFailed(reason);
            return Promise.reject(reason);
        });

        // Upload artifacts to Google Play, and store their version codes
        const versionCodes = new Array<number>();
        for (const releaseFile of releaseFiles) {
            core.info(`Uploading ${releaseFile}`);
            const versionCode = await uploadRelease(appEdit.data, options, releaseFile).catch(reason => {
                core.setFailed(reason);
                return Promise.reject(reason);
            });
            versionCodes.push(versionCode!);
        }
        core.info(`Successfully uploaded ${versionCodes.length} artifacts`)

        // Add the uploaded artifacts to the Edit track
        core.info(`Adding ${versionCodes.length} artifacts to release on '${options.track}' track`)
        const track = await addReleasesToTrack(appEdit.data, options, versionCodes);
        core.debug(`Track: ${track}`);

        // Commit the pending Edit
        core.info(`Committing the Edit`)
        const res = await androidPublisher.edits.commit({
            auth: options.auth,
            editId: appEdit.data.id!,
            packageName: options.applicationId
        });

        // Simple check to see whether commit was successful
        if (res.data.id != null) {
            core.info(`Successfully committed ${res.data.id}`);
            return Promise.resolve(res.data.id!);
        } else {
            core.setFailed(`Error ${res.status}: ${res.statusText}`);
            return Promise.reject(res.status);
        }
    }
}

async function uploadInternalSharingRelease(options: EditOptions, releaseFile: string): Promise<string | undefined | null> {
    if (releaseFile.endsWith('.apk')) {
        const res = await internalSharingUploadApk(options, releaseFile)
        core.setOutput("internalSharingDownloadUrl", res.downloadUrl);
        core.exportVariable("INTERNAL_SHARING_DOWNLOAD_URL", res.downloadUrl);
        console.log(`${releaseFile} uploaded to Internal Sharing, download it with ${res.downloadUrl}`)
        return Promise.resolve(res.downloadUrl)
    } else if (releaseFile.endsWith('.aab')) {
        const res = await internalSharingUploadBundle(options, releaseFile)
        core.setOutput("internalSharingDownloadUrl", res.downloadUrl);
        core.exportVariable("INTERNAL_SHARING_DOWNLOAD_URL", res.downloadUrl);
        console.log(`${releaseFile} uploaded to Internal Sharing, download it with ${res.downloadUrl}`)
        return Promise.resolve(res.downloadUrl)
    } else {
        return Promise.reject(`${releaseFile} is invalid`)
    }
}

async function uploadRelease(appEdit: AppEdit, options: EditOptions, releaseFile: string): Promise<number | undefined | null> {
    if (releaseFile.endsWith('.apk')) {
        const apk = await uploadApk(appEdit, options, releaseFile);
        await uploadMappingFile(appEdit, apk.versionCode!, options);
        return Promise.resolve(apk.versionCode);
    } else if (releaseFile.endsWith('.aab')) {
        const bundle = await uploadBundle(appEdit, options, releaseFile);
        await uploadMappingFile(appEdit, bundle.versionCode!, options);
        return Promise.resolve(bundle.versionCode);
    } else {
        return Promise.reject(`${releaseFile} is invalid`);
    }
}

async function validateSelectedTrack(appEdit: AppEdit, options: EditOptions): Promise<undefined> {
    const res = await androidPublisher.edits.tracks.list({
        auth: options.auth,
        editId: appEdit.id!,
        packageName: options.applicationId
    });
    const allTracks = res.data.tracks;
    if (allTracks == undefined || allTracks.find(value => value.track == options.track) == undefined) {
        return Promise.reject(`Track "${options.track}" could not be found `);
    }
}

async function addReleasesToTrack(appEdit: AppEdit, options: EditOptions, versionCodes: number[]): Promise<Track> {
    let status: string;
    if (options.userFraction != undefined) {
        status = 'inProgress';
    } else {
        status = 'completed';
    }

    core.debug(`Creating Track Release for Edit(${appEdit.id}) for Track(${options.track}) with a UserFraction(${options.userFraction}) and VersionCodes(${versionCodes})`);
    const res = await androidPublisher.edits.tracks
        .update({
            auth: options.auth,
            editId: appEdit.id!,
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
                        releaseNotes: await readLocalizedReleaseNotes(options.whatsNewDir),
                        versionCodes: versionCodes.filter(x => x != 0).map(x => x.toString())
                    }
                ]
            }
        });

    return res.data;
}

async function uploadMappingFile(appEdit: AppEdit, versionCode: number, options: EditOptions) {
    if (options.mappingFile != undefined && options.mappingFile.length > 0) {
        const mapping = readFileSync(options.mappingFile, 'utf-8');
        if (mapping != undefined) {
            core.debug(`[${appEdit.id}, versionCode=${versionCode}, packageName=${options.applicationId}]: Uploading Proguard mapping file @ ${options.mappingFile}`);
            await androidPublisher.edits.deobfuscationfiles.upload({
                auth: options.auth,
                packageName: options.applicationId,
                editId: appEdit.id!,
                apkVersionCode: versionCode,
                deobfuscationFileType: 'proguard',
                media: {
                    mimeType: 'application/octet-stream',
                    body: fs.createReadStream(options.mappingFile)
                }
            })
        }
    }
}

async function internalSharingUploadApk(options: EditOptions, apkReleaseFile: string): Promise<InternalAppSharingArtifact> {
    core.debug(`[packageName=${options.applicationId}]: Uploading Internal Sharing APK @ ${apkReleaseFile}`);

    const res = await androidPublisher.internalappsharingartifacts.uploadapk({
        auth: options.auth,
        packageName: options.applicationId,
        media: {
            mimeType: 'application/vnd.android.package-archive',
            body: fs.createReadStream(apkReleaseFile)
        }
    });

    return res.data;
}

async function internalSharingUploadBundle(options: EditOptions, bundleReleaseFile: string): Promise<InternalAppSharingArtifact> {
    core.debug(`[packageName=${options.applicationId}]: Uploading Internal Sharing Bundle @ ${bundleReleaseFile}`);

    const res = await androidPublisher.internalappsharingartifacts.uploadbundle({
        auth: options.auth,
        packageName: options.applicationId,
        media: {
            mimeType: 'application/octet-stream',
            body: fs.createReadStream(bundleReleaseFile)
        }
    });

    return res.data;
}

async function uploadApk(appEdit: AppEdit, options: EditOptions, apkReleaseFile: string): Promise<Apk> {
    core.debug(`[${appEdit.id}, packageName=${options.applicationId}]: Uploading APK @ ${apkReleaseFile}`);

    const res = await androidPublisher.edits.apks.upload({
        auth: options.auth,
        packageName: options.applicationId,
        editId: appEdit.id!,
        media: {
            mimeType: 'application/vnd.android.package-archive',
            body: fs.createReadStream(apkReleaseFile)
        }
    });

    return res.data
}

async function uploadBundle(appEdit: AppEdit, options: EditOptions, bundleReleaseFile: string): Promise<Bundle> {
    core.debug(`[${appEdit.id}, packageName=${options.applicationId}]: Uploading App Bundle @ ${bundleReleaseFile}`);
    const res = await androidPublisher.edits.bundles.upload({
        auth: options.auth,
        packageName: options.applicationId,
        editId: appEdit.id!,
        media: {
            mimeType: 'application/octet-stream',
            body: fs.createReadStream(bundleReleaseFile)
        }
    });

    return res.data
}