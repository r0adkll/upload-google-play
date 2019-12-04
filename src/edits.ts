import * as core from '@actions/core';
import * as fs from "fs";
import {readFileSync} from "fs";

import {google} from 'googleapis';
import {androidpublisher_v3} from "googleapis";

import AndroidPublisher = androidpublisher_v3.Androidpublisher;
import AppEdit = androidpublisher_v3.Schema$AppEdit;
import Apk = androidpublisher_v3.Schema$Apk;
import Bundle = androidpublisher_v3.Schema$Bundle;
import LocalizedText = androidpublisher_v3.Schema$LocalizedText;
import Track = androidpublisher_v3.Schema$Track;

import {Compute} from "google-auth-library/build/src/auth/computeclient";
import {JWT} from "google-auth-library/build/src/auth/jwtclient";
import {UserRefreshClient} from "google-auth-library/build/src/auth/refreshclient";

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

async function readLocalizedReleaseNotes(whatsNewDir: string | undefined): Promise<LocalizedText[] | undefined> {
    if (whatsNewDir != undefined) {
        const releaseNotes = fs.readdirSync(whatsNewDir).filter(value => /whatsnew-*-*/.test(value));
        const pattern = /whatsnew-(?<local>.*-.*)/.compile();

        let localizedReleaseNotes: LocalizedText[] = [];

        releaseNotes.forEach(value => {
            const matches = value.match(pattern);
            if (matches != undefined && matches.length == 2) {
                const lang = matches[1];
                const content = readFileSync(value, 'utf-8');

                if (content != undefined) {
                    core.debug(`Found localized 'whatsnew-*-*' for Lang(${lang})`);
                    localizedReleaseNotes.push(
                        {
                            language: lang,
                            text: content
                        }
                    )
                }
            }
        });

        return localizedReleaseNotes
    }
    return undefined
}

async function uploadMappingFile(appEdit: AppEdit, versionCode: number, options: EditOptions) {
    if (options.mappingFile != undefined) {
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
