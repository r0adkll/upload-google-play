import * as core from '@actions/core';
import * as fs from "fs";
import { readFileSync, lstatSync } from "fs";
import JSZip from 'jszip';
import path = require('path');
import { Readable } from 'stream';

import * as google from '@googleapis/androidpublisher';
import { androidpublisher_v3 } from "@googleapis/androidpublisher";

import AndroidPublisher = androidpublisher_v3.Androidpublisher;
import Apk = androidpublisher_v3.Schema$Apk;
import Bundle = androidpublisher_v3.Schema$Bundle;
import Track = androidpublisher_v3.Schema$Track;
import InternalAppSharingArtifact = androidpublisher_v3.Schema$InternalAppSharingArtifact;
import { GoogleAuth } from "google-auth-library/build/src/auth/googleauth"
import { readLocalizedReleaseNotes } from "./whatsnew";

const androidPublisher: AndroidPublisher = google.androidpublisher('v3');

export interface EditOptions {
    auth: GoogleAuth;
    applicationId: string;
    track: string;
    inAppUpdatePriority: number;
    userFraction?: number;
    whatsNewDir?: string;
    mappingFile?: string;
    debugSymbols?: string;
    name?: string;
    status: string;
    changesNotSentForReview?: boolean;
    existingEditId?: string;
}

export async function runUpload(
    packageName: string,
    track: string,
    inAppUpdatePriority: number | undefined,
    userFraction: number | undefined,
    whatsNewDir: string | undefined,
    mappingFile: string | undefined,
    debugSymbols: string | undefined,
    name: string | undefined,
    changesNotSentForReview: boolean,
    existingEditId: string | undefined,
    status: string,
    projectId: string,
    validatedReleaseFiles: string[]
) {
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
        projectId: projectId
    });

    const result = await uploadToPlayStore({
        auth: auth,
        applicationId: packageName,
        track: track,
        inAppUpdatePriority: inAppUpdatePriority || 0,
        userFraction: userFraction,
        whatsNewDir: whatsNewDir,
        mappingFile: mappingFile,
        debugSymbols: debugSymbols,
        name: name,
        changesNotSentForReview: changesNotSentForReview,
        existingEditId: existingEditId,
        status: status
    }, validatedReleaseFiles);

    if (result) {
        console.log(`Finished uploading to the Play Store: ${result}`)
    }
}

async function uploadToPlayStore(options: EditOptions, releaseFiles: string[]): Promise<string | void> {
    const internalSharingDownloadUrls: string[] = []
    
    // Check the 'track' for 'internalsharing', if so switch to a non-track api
    if (options.track === 'internalsharing') {
        core.debug("Track is Internal app sharing, switch to special upload api")
        for (const releaseFile of releaseFiles) {
            core.debug(`Uploading ${releaseFile}`);
            const url = await uploadInternalSharingRelease(options, releaseFile)
            internalSharingDownloadUrls.push(url)
        }
    } else {
        // Create a new Edit
        const appEditId = await getOrCreateEdit(options)

        // Validate the given track
        await validateSelectedTrack(appEditId, options)

        // Upload artifacts to Google Play, and store their version codes
        const versionCodes = await uploadReleaseFiles(appEditId, options, releaseFiles)

        // Infer the download URL from the version codes
        for (const versionCode of versionCodes) {
            const url = inferInternalSharingDownloadUrl(options.applicationId, versionCode);
            core.setOutput("internalSharingDownloadUrl", url);
            core.exportVariable("INTERNAL_SHARING_DOWNLOAD_URL", url);      
            internalSharingDownloadUrls.push(url);
        }

        // Add the uploaded artifacts to the Edit track
        await addReleasesToTrack(appEditId, options, versionCodes);

        // Commit the pending Edit
        core.info(`Committing the Edit`)
        const res = await androidPublisher.edits.commit({
            auth: options.auth,
            editId: appEditId,
            packageName: options.applicationId,
            changesNotSentForReview: options.changesNotSentForReview
        });

        // Simple check to see whether commit was successful
        if (res.data.id) {
            core.info(`Successfully committed ${res.data.id}`);
            return res.data.id
        } else {
            core.setFailed(`Error ${res.status}: ${res.statusText}`);
            return Promise.reject(res.status);
        }
    }

    core.setOutput("internalSharingDownloadUrls", internalSharingDownloadUrls);
    core.exportVariable("INTERNAL_SHARING_DOWNLOAD_URLS", internalSharingDownloadUrls);    
}

async function uploadInternalSharingRelease(options: EditOptions, releaseFile: string): Promise<string> {
    let res: google.androidpublisher_v3.Schema$InternalAppSharingArtifact
    if (releaseFile.endsWith('.apk')) {
        res = await internalSharingUploadApk(options, releaseFile)
    } else if (releaseFile.endsWith('.aab')) {
        res = await internalSharingUploadBundle(options, releaseFile)
    } else {
        throw Error(`${releaseFile} is invalid (missing or invalid file extension).`)
    }
    
    if (!res.downloadUrl) throw Error('Uploaded file has no download URL.')
    core.setOutput("internalSharingDownloadUrl", res.downloadUrl);
    core.exportVariable("INTERNAL_SHARING_DOWNLOAD_URL", res.downloadUrl);
    console.log(`${releaseFile} uploaded to Internal Sharing, download it with ${res.downloadUrl}`)

    return res.downloadUrl
}

async function validateSelectedTrack(appEditId: string, options: EditOptions): Promise<void> {
    core.info(`Validating track '${options.track}'`)
    const res = await androidPublisher.edits.tracks.list({
        auth: options.auth,
        editId: appEditId,
        packageName: options.applicationId
    });

    // If we didn't get status 200, i.e. success, propagate the error with valid text
    if (res.status != 200) {
        throw Error(res.statusText)
    }

    const allTracks = res.data.tracks;
    // Check whether we actually have any tracks
    if (!allTracks) {
        throw Error('No tracks found, unable to validate track.')
    }

    // Check whether the track is valid
    if (allTracks.find(value => value.track == options.track) == undefined) {
        const allTrackNames = allTracks.map((track) => { return track.track });
        throw Error(`Track "${options.track}" could not be found. Available tracks are: ${allTrackNames.toString()}`);
    }
}

async function addReleasesToTrack(appEditId: string, options: EditOptions, versionCodes: number[]): Promise<Track> {
    const status = options.status

    core.debug(`Creating release for:`);
    core.debug(`edit=${appEditId}`)
    core.debug(`track=${options.track}`)
    if (options.userFraction) {
        core.debug(`userFraction=${options.userFraction}`)
    }
    core.debug(`status=${status}`)
    core.debug(`versionCodes=${versionCodes.toString()}`)

    const res = await androidPublisher.edits.tracks
        .update({
            auth: options.auth,
            editId: appEditId,
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

async function uploadMappingFile(appEditId: string, versionCode: number, options: EditOptions) {
    if (options.mappingFile != undefined && options.mappingFile.length > 0) {
        const mapping = readFileSync(options.mappingFile, 'utf-8');
        if (mapping != undefined) {
            core.debug(`[${appEditId}, versionCode=${versionCode}, packageName=${options.applicationId}]: Uploading Proguard mapping file @ ${options.mappingFile}`);
            await androidPublisher.edits.deobfuscationfiles.upload({
                auth: options.auth,
                packageName: options.applicationId,
                editId: appEditId,
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

async function uploadDebugSymbolsFile(appEditId: string, versionCode: number, options: EditOptions) {
    if (options.debugSymbols != undefined && options.debugSymbols.length > 0) {
        const fileStat = lstatSync(options.debugSymbols);

        let data: Buffer | null = null;
        if (fileStat.isDirectory()) {
            data = await createDebugSymbolZipFile(options.debugSymbols);
        }

        if (data == null) {
            data = readFileSync(options.debugSymbols);
        }

        if (data != null) {
            core.debug(`[${appEditId}, versionCode=${versionCode}, packageName=${options.applicationId}]: Uploading Debug Symbols file @ ${options.debugSymbols}`);
            await androidPublisher.edits.deobfuscationfiles.upload({
                auth: options.auth,
                packageName: options.applicationId,
                editId: appEditId,
                apkVersionCode: versionCode,
                deobfuscationFileType: 'nativeCode',
                media: {
                    mimeType: 'application/octet-stream',
                    body: Readable.from(data)
                }
            })
        }
    }
}

async function zipFileAddDirectory(root: JSZip | null, dirPath: string, rootPath: string, isRootRoot: boolean) {
	if (root == null) return root;

	const newRootPath = path.join(rootPath, dirPath);
	const fileStat = lstatSync(newRootPath);

	if (!fileStat.isDirectory()) {
		const data = readFileSync(newRootPath);
		root.file(dirPath, data);
		return root;
	}

	const dir = fs.readdirSync(newRootPath);
	const zipFolder = isRootRoot ? root : root.folder(dirPath);
	for (let pathIndex = 0; pathIndex < dir.length; pathIndex++) {
		const underPath = dir[pathIndex];
		await zipFileAddDirectory(zipFolder, underPath, newRootPath, false);
	}

	return root;
}

async function createDebugSymbolZipFile(debugSymbolsPath: string) {
    const zipFile = JSZip();
    await zipFileAddDirectory(zipFile, ".", debugSymbolsPath, true);

    return zipFile.generateAsync({ type: "nodebuffer" });
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

async function uploadApk(appEditId: string, options: EditOptions, apkReleaseFile: string): Promise<Apk> {
    core.debug(`[${appEditId}, packageName=${options.applicationId}]: Uploading APK @ ${apkReleaseFile}`);

    const res = await androidPublisher.edits.apks.upload({
        auth: options.auth,
        packageName: options.applicationId,
        editId: appEditId,
        media: {
            mimeType: 'application/vnd.android.package-archive',
            body: fs.createReadStream(apkReleaseFile)
        }
    });

    return res.data
}

async function uploadBundle(appEditId: string, options: EditOptions, bundleReleaseFile: string): Promise<Bundle> {
    core.debug(`[${appEditId}, packageName=${options.applicationId}]: Uploading App Bundle @ ${bundleReleaseFile}`);
    const res = await androidPublisher.edits.bundles.upload({
        auth: options.auth,
        packageName: options.applicationId,
        editId: appEditId,
        media: {
            mimeType: 'application/octet-stream',
            body: fs.createReadStream(bundleReleaseFile)
        }
    });

    return res.data
}

async function getOrCreateEdit(options: EditOptions): Promise<string> {
    // If we already have an ID, just return that
    if (options.existingEditId) {
        return options.existingEditId
    }

    // Else attempt to create a new edit. This will throw if there is an issue
    core.info(`Creating a new Edit for this release`)
    const insertResult = await androidPublisher.edits.insert({
        auth: options.auth,
        packageName: options.applicationId
    })

    // If we didn't get status 200, i.e. success, propagate the error with valid text
    if (insertResult.status != 200) {
        throw Error(insertResult.statusText)
    }

    // If the result was successful but we have no ID, somethign went horribly wrong
    if (!insertResult.data.id) {
        throw Error('New edit has no ID, cannot continue.')
    }

    core.debug(`This new edit expires at ${String(insertResult.data.expiryTimeSeconds)}`)
    // Return the new edit ID
    return insertResult.data.id
}

async function uploadReleaseFiles(appEditId: string, options: EditOptions, releaseFiles: string[]): Promise<number[]> {
    const versionCodes: number[] = []
    // Upload all release files
    for (const releaseFile of releaseFiles) {
        core.info(`Uploading ${releaseFile}`)
        let versionCode: number
        if (releaseFile.endsWith('.apk')) {
            // Upload APK, or throw when something goes wrong
            const apk = await uploadApk(appEditId, options, releaseFile);
            if (!apk.versionCode) throw Error('Failed to upload APK.')
            versionCode = apk.versionCode
        } else if (releaseFile.endsWith('.aab')) {
            // Upload AAB, or throw when something goes wrong
            const bundle = await uploadBundle(appEditId, options, releaseFile);
            if (!bundle.versionCode) throw Error('Failed to upload bundle.')
            versionCode = bundle.versionCode
        } else {
            // Throw if file extension is not right
            throw Error(`${releaseFile} is invalid.`);
        }

        // Upload version code
        await uploadMappingFile(appEditId, versionCode, options)
        await uploadDebugSymbolsFile(appEditId, versionCode, options)
        versionCodes.push(versionCode)
    }

    core.info(`Successfully uploaded ${versionCodes.length} artifacts`)

    return versionCodes
}

function inferInternalSharingDownloadUrl(
  applicationId: string,
  versionCode: number
) {
  return `https://play.google.com/apps/test/${applicationId}/${versionCode}`;
}