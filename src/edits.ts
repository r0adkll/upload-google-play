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

export async function uploadRelease(options: EditOptions, releaseFile: string) {
    const appEdit = await androidPublisher.edits.insert({
        auth: options.auth,
        packageName: options.applicationId
    });

    const allTracks = await getAllTracks(appEdit.data!, options);
    if (allTracks == undefined || allTracks.find(value => value.track == options.track) == undefined) {
        core.setFailed(`Track "${options.track}" could not be found `)
        return Promise.reject(`No track found for "${options.track}"`)
    }

    let track: Track | undefined = undefined;
    if (releaseFile.endsWith('.apk')) {
        const apk = await uploadApk(appEdit.data, options, releaseFile);
        await uploadMappingFile(appEdit.data, apk.versionCode!, options);
        track = await trackVersionCode(appEdit.data, options, apk.versionCode!)
    } else if (releaseFile.endsWith('.aab')) {
        const bundle = await uploadBundle(appEdit.data, options, releaseFile);
        await uploadMappingFile(appEdit.data, bundle.versionCode!, options);
        track = await trackVersionCode(appEdit.data, options, bundle.versionCode!)
    } else {
        return Promise.reject("Invalid release file")
    }

    if (track != undefined) {
        const res = await androidPublisher.edits.commit({
            auth: options.auth,
            editId: appEdit.data.id!,
            packageName: options.applicationId
        });

        core.debug(`Committed release with Id(${res.data.id}) and Track: ${track}`);
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
