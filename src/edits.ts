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
    userFraction?: number;
    whatsNewDir?: string;
    mappingFile?: string;
}

export async function uploadToPlayStore(options: EditOptions, releaseFiles: string[]): Promise<string | undefined> {
    const appEdit = await androidPublisher.edits.insert({
        auth: options.auth,
        packageName: options.applicationId
    });
    
    releaseFiles.forEach(async releaseFile => {
        core.debug(`Uploading ${releaseFile}`)
        await uploadRelease(appEdit.data, options, releaseFile).catch(reason => {
            return Promise.reject(reason)
        })
    })

    const res = await androidPublisher.edits.commit({
        auth: options.auth,
        editId: appEdit.data.id!,
        packageName: options.applicationId
    });

    if (res.data.id != null) {
        core.debug(`Successfully committed ${res.data.id}`)
        return Promise.resolve(res.data.id!)
    } else {
        core.setFailed(`Error ${res.status}: ${res.statusText}`)
        return Promise.reject(res.status)
    }
}

async function uploadRelease(appEdit: AppEdit, options: EditOptions, releaseFile: string): Promise<string | undefined | null> {
    // Check the 'track' for 'internalsharing', if so switch to a non-track api
    if (options.track === 'internalsharing'){
        core.debug("Track is Internal app sharing, switch to special upload api")
        if (releaseFile.endsWith('.apk')) {
            const res = await internalSharingUploadApk(options, releaseFile)
            return Promise.resolve(res.downloadUrl)
        } else if (releaseFile.endsWith('.aab')) {
            const res = await internalSharingUploadBundle(options, releaseFile)
            return Promise.resolve(res.downloadUrl)
        } else {
            core.setFailed(`${releaseFile} is invalid`)
            return Promise.reject(`${releaseFile} is invalid`)
        }
    }

    const allTracks = await getAllTracks(appEdit!, options);
    if (allTracks == undefined || allTracks.find(value => value.track == options.track) == undefined) {
        core.setFailed(`Track "${options.track}" could not be found `)
        return Promise.reject(`No track found for "${options.track}"`)
    }

    let track: Track | undefined = undefined;
    if (releaseFile.endsWith('.apk')) {
        const apk = await uploadApk(appEdit, options, releaseFile);
        await uploadMappingFile(appEdit, apk.versionCode!, options);
        track = await trackVersionCode(appEdit, options, apk.versionCode!)
    } else if (releaseFile.endsWith('.aab')) {
        const bundle = await uploadBundle(appEdit, options, releaseFile);
        await uploadMappingFile(appEdit, bundle.versionCode!, options);
        track = await trackVersionCode(appEdit, options, bundle.versionCode!)
    } else {
        core.setFailed(`${releaseFile} is invalid`)
        return Promise.reject(`${releaseFile} is invalid`)
    }
}

async function getAllTracks(appEdit: AppEdit, options: EditOptions): Promise<Track[] | undefined> {
    const res = await androidPublisher.edits.tracks.list({
        auth: options.auth,
        editId: appEdit.id!,
        packageName: options.applicationId
    });

    return res.data.tracks
}

async function trackVersionCode(appEdit: AppEdit, options: EditOptions, versionCode: number): Promise<Track> {
    let status: string;
    if (options.userFraction != undefined) {
        status = 'inProgress'
    } else {
        status = 'completed'
    }

    core.debug(`Creating Track Release for Edit(${appEdit.id}) for Track(${options.track}) with a UserFraction(${options.userFraction}) and VersionCode(${versionCode})`);
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
                        userFraction: options.userFraction,
                        status: status,
                        releaseNotes: await readLocalizedReleaseNotes(options.whatsNewDir),
                        versionCodes: [
                            versionCode.toString()
                        ]
                    }
                ]
            }
        });

    return res.data
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
