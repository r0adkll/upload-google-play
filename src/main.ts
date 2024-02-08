import * as core from '@actions/core'
import * as fs from "fs"
import { runUpload } from "./edits"
import { validateInAppUpdatePriority, validateReleaseFiles, validateStatus, validateUserFraction } from "./input-validation"
import { unlink, writeFile } from 'fs/promises'
import pTimeout from 'p-timeout'

export async function run() {
    try {
        const serviceAccountJson = core.getInput('serviceAccountJson', { required: false });
        const serviceAccountJsonRaw = core.getInput('serviceAccountJsonPlainText', { required: false});
        const packageName = core.getInput('packageName', { required: true });
        const releaseFile = core.getInput('releaseFile', { required: false });
        const projectId = core.getInput('projectId', { required: false });
        const releaseFiles = core.getInput('releaseFiles', { required: false })
            ?.split(',')
            ?.filter(x => x !== '');
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

        // Validate user fraction
        let userFractionFloat: number | undefined
        if (userFraction) {
            userFractionFloat = parseFloat(userFraction)
        } else {
            userFractionFloat = undefined
        }
        await validateUserFraction(userFractionFloat)

        // Validate release status
        await validateStatus(status, userFractionFloat != undefined && !isNaN(userFractionFloat))

        // Validate the inAppUpdatePriority to be a valid number in within [0, 5]
        let inAppUpdatePriorityInt: number | undefined
        if (inAppUpdatePriority) {
            inAppUpdatePriorityInt = parseInt(inAppUpdatePriority)
        } else {
            inAppUpdatePriorityInt = undefined
        }
        await validateInAppUpdatePriority(inAppUpdatePriorityInt)

        // Check release files while maintaining backward compatibility
        if (releaseFile) {
            core.warning(`WARNING!! 'releaseFile' is deprecated and will be removed in a future release. Please migrate to 'releaseFiles'`)
        }
        const validatedReleaseFiles: string[] = await validateReleaseFiles(releaseFiles ?? [releaseFile])

        if (whatsNewDir != undefined && whatsNewDir.length > 0 && !fs.existsSync(whatsNewDir)) {
            core.warning(`Unable to find 'whatsnew' directory @ ${whatsNewDir}`);
        }

        if (mappingFile != undefined && mappingFile.length > 0 && !fs.existsSync(mappingFile)) {
            core.warning(`Unable to find 'mappingFile' @ ${mappingFile}`);
        }

        if (debugSymbols != undefined && debugSymbols.length > 0 && !fs.existsSync(debugSymbols)) {
            core.warning(`Unable to find 'debugSymbols' @ ${debugSymbols}`);
        }

        await pTimeout(
            runUpload(
                packageName,
                track,
                inAppUpdatePriorityInt,
                userFractionFloat,
                whatsNewDir,
                mappingFile,
                debugSymbols,
                releaseName,
                changesNotSentForReview,
                existingEditId,
                status,
                projectId,
                validatedReleaseFiles
            ),
            {
                milliseconds: 3.6e+6
            }
        )
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

async function validateServiceAccountJson(serviceAccountJsonRaw: string | undefined, serviceAccountJson: string | undefined): Promise<string | undefined> {
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
        return Promise.reject("You must provide one of 'serviceAccountJsonPlainText' or 'serviceAccountJson' to use this action")
    }
}

void run();
