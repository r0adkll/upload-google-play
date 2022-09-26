import fg from "fast-glob";

export async function validateUserFraction(userFraction: number | undefined): Promise<void> {
    if (userFraction != undefined) {
        // If userFraction was set, perform basic validation
        if (isNaN(userFraction)) {
            return Promise.reject(new Error(`'userFraction' must be a number! Got ${userFraction}`))
        }
        if (userFraction >= 1 || userFraction <= 0) {
            return Promise.reject(new Error(`'userFraction' must be between 0 and 1! Got ${userFraction}`))
        }
    }
}

export async function validateStatus(status: string | undefined, hasUserFraction: boolean): Promise<void> {
    // If status was set, perform basic validation
    if (status != 'completed' && status != 'inProgress' && status != 'halted' && status != 'draft') {
        return Promise.reject(new Error(`Invalid status provided! Must be one of 'completed', 'inProgress', 'halted', 'draft'. Got ${status ?? "undefined"}`))
    }

    // Validate userFraction is correct for the given status
    switch (status) {
        case 'completed':
        case 'draft':
            if (hasUserFraction) {
                return Promise.reject(new Error(`Status '${status}' does not support 'userFraction'`))
            }
            break
        case 'halted':
        case 'inProgress':
            if (!hasUserFraction) {
                return Promise.reject(new Error(`Status '${status}' requires a 'userFraction' to be set`))
            }
            break
    }
}

export async function validateInAppUpdatePriority(inAppUpdatePriority: number | undefined): Promise<void> {
    if (inAppUpdatePriority) {
        if (inAppUpdatePriority < 0 || inAppUpdatePriority > 5) {
            return Promise.reject(new Error('inAppUpdatePriority must be between 0 and 5, inclusive-inclusive'))
        }
    }
}

export async function validateReleaseFiles(releaseFiles: string[] | undefined): Promise<string[]> {
    if (!releaseFiles) {
        return Promise.reject(new Error(`You must provide 'releaseFiles' in your configuration`))
    } else {
        const files = await fg(releaseFiles)
        if (!files.length) {
            return Promise.reject(new Error(`Unable to find any release file matching ${releaseFiles.join(',')}`))
        }
        return files
    }
}
