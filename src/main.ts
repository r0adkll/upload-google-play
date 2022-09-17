import * as core from '@actions/core';
import * as fs from "fs";
import fg from "fast-glob";
import {uploadToPlayStore} from "./edits";
import * as google from '@googleapis/androidpublisher';
import { unlink, writeFile } from 'fs/promises';
import { exit } from 'process';

const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/androidpublisher']
});

async function run() {
    try {
        const serviceAccountJson = core.getInput('serviceAccountJson', { required: false });
        const serviceAccountJsonRaw = core.getInput('serviceAccountJsonPlainText', { required: false});
        const packageName = core.getInput('packageName', { required: true });
        const releaseFile = core.getInput('releaseFile', { required: false });
        const releaseFiles = core.getInput('releaseFiles', { required: false })
            ?.split(',')
            ?.filter(x => x !== '') || [];
        const releaseName = core.getInput('releaseName', { required: false });
        const track = core.getInput('track', { required: true });
        const inAppUpdatePriority = core.getInput('inAppUpdatePriority', { required: false });
        const userFraction = core.getInput('userFraction', { required: false })
        const status = core.getInput('status', { required: false });
        const whatsNewDir = core.getInput('whatsNewDirectory', { required: false });
        const mappingFile = core.getInput('mappingFile', { required: false });
        const debugSymbols = core.getInput('debugSymbols', { required: false });
        const changesNotSentForReview = core.getInput('changesNotSentForReview', { required: false }) == 'true';
        const existingEditId = core.getInput('existingEditId');

        await validateServiceAccountJson(serviceAccountJsonRaw, serviceAccountJson)

        validateUserFractionAndStatus(userFraction, status)

        // Validate the inAppUpdatePriority to be a valid number in within [0, 5]
        let inAppUpdatePriorityInt: number | undefined = parseInt(inAppUpdatePriority);
        if (!isNaN(inAppUpdatePriorityInt)) {
            if (inAppUpdatePriorityInt < 0 || inAppUpdatePriorityInt > 5) {
                core.setFailed('inAppUpdatePriority must be between 0 and 5, inclusive-inclusive');
                return;
            }
        } else {
            inAppUpdatePriorityInt = undefined;
        }

        // Check release files while maintaining backward compatibility
        let validatedReleaseFiles: string[] = [];
        if (releaseFiles.length == 0 && !releaseFile) {
            core.setFailed(`You must provide either 'releaseFile' or 'releaseFiles' in your configuration.`);
            return;
        } else if (releaseFiles.length == 0 && releaseFile) {
            core.warning(`WARNING!! 'releaseFile' is deprecated and will be removed in a future release. Please migrate to 'releaseFiles'.`);
            core.debug(`Validating ${releaseFile} exists`)
            if (!fs.existsSync(releaseFile)) {
                core.setFailed(`Unable to find release file @ ${releaseFile}`);
                return;
            } else {
                validatedReleaseFiles = [releaseFile];
            }
        } else if (releaseFiles.length > 0) {
            core.debug(`Finding files ${releaseFiles.join(',')}`)
            const files = await fg(releaseFiles);
            if (!files.length) {
                core.setFailed(`Unable to find any release file @ ${releaseFiles.join(',')}`);
                return;
            }
            validatedReleaseFiles = files;
        }

        if (whatsNewDir != undefined && whatsNewDir.length > 0 && !fs.existsSync(whatsNewDir)) {
            core.setFailed(`Unable to find 'whatsnew' directory @ ${whatsNewDir}`);
            return
        }

        if (mappingFile != undefined && mappingFile.length > 0 && !fs.existsSync(mappingFile)) {
            core.setFailed(`Unable to find 'mappingFile' @ ${mappingFile}`);
            return
        }

        if (debugSymbols != undefined && debugSymbols.length > 0 && !fs.existsSync(debugSymbols)) {
            core.setFailed(`Unable to find 'debugSymbols' @ ${debugSymbols}`);
            return
        }

        const authClient = await auth.getClient();

        const result = await uploadToPlayStore({
            auth: authClient,
            applicationId: packageName,
            track: track,
            inAppUpdatePriority: inAppUpdatePriorityInt || 0,
            userFraction: parseFloat(userFraction),
            whatsNewDir: whatsNewDir,
            mappingFile: mappingFile,
            debugSymbols: debugSymbols,
            name: releaseName,
            changesNotSentForReview: changesNotSentForReview,
            existingEditId: existingEditId,
            status: status
        }, validatedReleaseFiles);

        if (result) {
            console.log(`Finished uploading to the Play Store: ${result}`)
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            core.setFailed(error.message)
        } else {
            core.setFailed('Unknown error occurred.')
        }
    } finally {
        if (core.getInput('serviceAccountJsonPlainText', { required: false})) {
            // Cleanup our auth file that we created.
            core.debug('Cleaning up service account json file');
            await unlink('./serviceAccountJson.json');
        }
    }
}

async function validateServiceAccountJson(serviceAccountJsonRaw: string | undefined, serviceAccountJson: string | undefined) {
    if (serviceAccountJson && serviceAccountJsonRaw) {
        // If the user provided both, print a warning one will be ignored
        core.warning('Both \'serviceAccountJsonPlainText\' and \'serviceAccountJson\' were provided! \'serviceAccountJson\' will be ignored.')
    }
    
    if (serviceAccountJsonRaw) {
        // If the user has provided the raw plain text, then write to file and set appropriate env variable
        const serviceAccountFile = "./serviceAccountJson.json";
        await writeFile(serviceAccountFile, serviceAccountJsonRaw, {
            encoding: 'utf8'
        });
        core.exportVariable("GOOGLE_APPLICATION_CREDENTIALS", serviceAccountFile)
    } else if (serviceAccountJson) {
        // If the user has provided the json path, then set appropriate env variable
        core.exportVariable("GOOGLE_APPLICATION_CREDENTIALS", serviceAccountJson)
    } else {
        // If the user provided neither, fail and exit
        core.setFailed("You must provide one of 'serviceAccountJsonPlainText' or 'serviceAccountJson' to use this action")
        exit()
    }
}

function validateUserFractionAndStatus(userFraction: string | undefined, status: string | undefined) {
    if (!userFraction && !status) {
        core.setFailed(`You must specify one or both of 'userFraction' or 'status'`)
        exit()
    }

    if (userFraction) {
        // If userFraction was set, perform basic validation
        const userFractionFloat = parseFloat(userFraction)
        if (isNaN(userFractionFloat)) {
            core.setFailed(`'userFraction' must be a number! Got ${userFraction}`)
            exit()
        }
        if (userFractionFloat >= 1 && userFractionFloat <= 0) {
            core.setFailed(`'userFraction' must be between 0 and 1! Got ${userFractionFloat}`)
            exit()
        }
    }

    if (status) {
        // If status was set, perform basic validation
        if (status != 'completed' && status != 'inProgress' && status != 'halted' && status != 'draft') {
            core.setFailed(`Invalid status provided! Must be one of 'completed', 'inProgress', 'halted', 'draft'. Got ${status}`)
            exit()
        }

        // Validate userFraction is correct for the given status
        switch (status) {
            case 'completed':
            case 'draft':
                if (userFraction) {
                    core.warning(`Status 'completed' does not support 'userFraction', it will be ignored`)
                    userFraction = undefined
                }
                break
            case 'halted':
            case 'inProgress':
                if (!userFraction) {
                    core.setFailed(`Status '${status}' requires a 'userFraction' to be set`)
                    exit()
                }
                break
        }
    }
}

void run();
