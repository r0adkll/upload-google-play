import * as core from '@actions/core';
import { R_OK } from 'constants';
import fg from "fast-glob";
import { access } from 'fs/promises';
import { exit } from 'process';

function failValidation(message: string): void {
    core.setFailed(message)
    exit()
}

export function validateUserFractionAndStatus(userFraction: string | undefined, status: string | undefined): void {
    if (!userFraction && !status) {
        failValidation(`You must specify one or both of 'userFraction' or 'status'`)
    }

    if (userFraction) {
        // If userFraction was set, perform basic validation
        const userFractionFloat = parseFloat(userFraction)
        if (isNaN(userFractionFloat)) {
            failValidation(`'userFraction' must be a number! Got ${userFraction}`)
        }
        if (userFractionFloat >= 1 && userFractionFloat <= 0) {
            failValidation(`'userFraction' must be between 0 and 1! Got ${userFractionFloat}`)
        }
    }

    if (status) {
        // If status was set, perform basic validation
        if (status != 'completed' && status != 'inProgress' && status != 'halted' && status != 'draft') {
            failValidation(`Invalid status provided! Must be one of 'completed', 'inProgress', 'halted', 'draft'. Got ${status}`)
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
                    failValidation(`Status '${status}' requires a 'userFraction' to be set`)
                }
                break
        }
    }
}

export function validateInAppUpdatePriority(inAppUpdatePriority: number | undefined): void {
    if (inAppUpdatePriority) {
        if (inAppUpdatePriority < 0 || inAppUpdatePriority > 5) {
            failValidation('inAppUpdatePriority must be between 0 and 5, inclusive-inclusive')
        }
    }
}

export async function validateReleaseFiles(releaseFiles: string[] | undefined): Promise<void> {
    if (!releaseFiles) {
        failValidation(`You must provide either 'releaseFile' or 'releaseFiles' in your configuration`)
    } else {
        const files = await fg(releaseFiles)
        if (!files.length) {
            failValidation(`Unable to find any release file matching ${releaseFiles.join(',')}`)
        }
        core.debug(`Found the following release files:\n${releaseFiles.join('\n')}`)
    }
    for (const releaseFile in releaseFiles) {
        try {
            await access(releaseFile, R_OK)
        } catch {
            failValidation(`Unable to find release file @ ${releaseFile}`)
        }
    }
}
