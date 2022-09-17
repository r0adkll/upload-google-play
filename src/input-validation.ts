import * as core from '@actions/core';
import { R_OK } from 'constants';
import fg from "fast-glob";
import { access } from 'fs/promises';

export function validateUserFractionAndStatus(userFraction: number | undefined, status: string | undefined): string | undefined {
    if (!userFraction && !status) {
        return `You must specify one or both of 'userFraction' or 'status'`
    }

    if (userFraction) {
        // If userFraction was set, perform basic validation
        if (isNaN(userFraction)) {
            return `'userFraction' must be a number! Got ${userFraction}`
        }
        if (userFraction >= 1 && userFraction <= 0) {
            return `'userFraction' must be between 0 and 1! Got ${userFraction}`
        }
    }

    if (status) {
        // If status was set, perform basic validation
        if (status != 'completed' && status != 'inProgress' && status != 'halted' && status != 'draft') {
            return `Invalid status provided! Must be one of 'completed', 'inProgress', 'halted', 'draft'. Got ${status}`
        }

        // Validate userFraction is correct for the given status
        switch (status) {
            case 'completed':
            case 'draft':
                if (userFraction) {
                    return `Status 'completed' does not support 'userFraction'`
                }
                break
            case 'halted':
            case 'inProgress':
                if (!userFraction) {
                    return `Status '${status}' requires a 'userFraction' to be set`
                }
                break
        }
    }
}

export function validateInAppUpdatePriority(inAppUpdatePriority: number | undefined): string | undefined {
    if (inAppUpdatePriority) {
        if (inAppUpdatePriority < 0 || inAppUpdatePriority > 5) {
            return 'inAppUpdatePriority must be between 0 and 5, inclusive-inclusive'
        }
    }
}

export async function validateReleaseFiles(releaseFiles: string[] | undefined): Promise<string | undefined> {
    if (!releaseFiles) {
        return `You must provide either 'releaseFile' or 'releaseFiles' in your configuration`
    } else {
        const files = await fg(releaseFiles)
        if (!files.length) {
            return `Unable to find any release file matching ${releaseFiles.join(',')}`
        }
        core.debug(`Found the following release files:\n${releaseFiles.join('\n')}`)
    }
    for (const releaseFile of releaseFiles) {
        try {
            await access(releaseFile, R_OK)
        } catch {
            return `Unable to find release file @ ${releaseFile}`
        }
    }
}
