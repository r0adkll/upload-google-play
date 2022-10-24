import { run } from "../src/main"

// Mock our edits interface to simply succeed
jest.mock("../src/edits", () => {
    const originalModule = jest.requireActual("../src/edits")

    return {
        __esModule: true,
        ...originalModule,
        runUpload: Promise.resolve()
    }
})

// We need to mock setFailed so we can actually capture issues instead of setting the process exit code
jest.mock("@actions/core", () => {
    const originalModule = jest.requireActual("@actions/core")

    return {
        __esModule: true,
        ...originalModule,
        setFailed: jest.fn((message: string | Error) => {
            if (message instanceof Error) {
                throw message
            }
            throw Error(message)
        })
    }
})

interface InputOptions {
    serviceAccountJson: string | undefined,
    serviceAccountJsonRaw: string | undefined,
    packageName: string | undefined,
    releaseFile: string | undefined,
    releaseFiles: string | undefined,
    releaseName: string | undefined,
    track: string | undefined,
    inAppUpdatePriority: string | undefined,
    userFraction: string | undefined,
    status: string | undefined,
    whatsNewDir: string | undefined,
    mappingFile: string | undefined,
    debugSymbols: string | undefined,
    changesNotSentForReview: string | undefined,
    existingEditId: string | undefined,
}

function initInputs(params: InputOptions) {
    if (params.serviceAccountJson) {
        process.env.INPUT_SERVICEACCOUNTJSON = params.serviceAccountJson
    } else {
        delete process.env.INPUT_SERVICEACCOUNTJSON
    }
    if (params.serviceAccountJsonRaw) {
        process.env.INPUT_SERVICEACCOUNTJSONPLAINTEXT = params.serviceAccountJsonRaw
    } else {
        delete process.env.INPUT_SERVICEACCOUNTJSONPLAINTEXT
    }
    if (params.packageName) {
        process.env.INPUT_PACKAGENAME = params.packageName
    } else {
        delete process.env.INPUT_PACKAGENAME
    }
    if (params.releaseFile) {
        process.env.INPUT_RELEASEFILE = params.releaseFile
    } else {
        delete process.env.INPUT_RELEASEFILE
    }
    if (params.releaseFiles) {
        process.env.INPUT_RELEASEFILES = params.releaseFiles
    } else {
        delete process.env.INPUT_RELEASEFILES
    }
    if (params.releaseName) {
        process.env.INPUT_RELEASENAME = params.releaseName
    } else {
        delete process.env.INPUT_RELEASENAME
    }
    if (params.track) {
        process.env.INPUT_TRACK = params.track
    } else {
        delete process.env.INPUT_TRACK
    }
    if (params.inAppUpdatePriority) {
        process.env.INPUT_INAPPUPDATEPRIORITY = params.inAppUpdatePriority
    } else {
        delete process.env.INPUT_INAPPUPDATEPRIORITY
    }
    if (params.userFraction) {
        process.env.INPUT_USERFRACTION = params.userFraction
    } else {
        delete process.env.INPUT_USERFRACTION
    }
    if (params.status) {
        process.env.INPUT_STATUS = params.status
    } else {
        delete process.env.INPUT_STATUS
    }
    if (params.whatsNewDir) {
        process.env.INPUT_WHATSNEWDIR = params.whatsNewDir
    } else {
        delete process.env.INPUT_WHATSNEWDIR
    }
    if (params.mappingFile) {
        process.env.INPUT_MAPPINGFILE = params.mappingFile
    } else {
        delete process.env.INPUT_MAPPINGFILE
    }
    if (params.debugSymbols) {
        process.env.INPUT_DEBUGSYMBOLS = params.debugSymbols
    } else {
        delete process.env.INPUT_DEBUGSYMBOLS
    }
    if (params.changesNotSentForReview) {
        process.env.INPUT_CHANGESNOTSENTFORREVIEW = params.changesNotSentForReview
    } else {
        delete process.env.INPUT_CHANGESNOTSENTFORREVIEW
    }
    if (params.existingEditId) {
        process.env.INPUT_EXISTINGEDITID = params.existingEditId
    } else {
        delete process.env.INPUT_EXISTINGEDITID
    }
}

test("correct inputs for complete rollout", async () => {
    // Run with the bare minimum
    initInputs({
        serviceAccountJson: undefined,
        serviceAccountJsonRaw: "{}",
        packageName: "com.package.name",
        releaseFile: undefined,
        releaseFiles: "./__tests__/releasefiles/*.aab",
        releaseName: undefined,
        track: "production",
        inAppUpdatePriority: undefined,
        userFraction: undefined,
        status: "completed",
        whatsNewDir: undefined,
        mappingFile: undefined,
        debugSymbols: undefined,
        changesNotSentForReview: undefined,
        existingEditId: undefined
    })
    await run()

    // Test with optional extras
    initInputs({
        serviceAccountJson: undefined,
        serviceAccountJsonRaw: "{}",
        packageName: "com.package.name",
        releaseFile: undefined,
        releaseFiles: "./__tests__/releasefiles/*.aab",
        releaseName: "Release name",
        track: "production",
        inAppUpdatePriority: "3",
        userFraction: undefined,
        status: "completed",
        whatsNewDir: "./__tests__/whatsnew",
        mappingFile: undefined,
        debugSymbols: undefined,
        changesNotSentForReview: "true",
        existingEditId: "123"
    })
    await run()
})

test("correct inputs for inProgress rollout", async () => {
    // Run with the bare minimum
    initInputs({
        serviceAccountJson: undefined,
        serviceAccountJsonRaw: "{}",
        packageName: "com.package.name",
        releaseFile: undefined,
        releaseFiles: "./__tests__/releasefiles/*.aab",
        releaseName: undefined,
        track: "production",
        inAppUpdatePriority: undefined,
        userFraction: "0.99",
        status: "inProgress",
        whatsNewDir: undefined,
        mappingFile: undefined,
        debugSymbols: undefined,
        changesNotSentForReview: undefined,
        existingEditId: undefined
    })
    await run()

    // Test with optional extras
    initInputs({
        serviceAccountJson: undefined,
        serviceAccountJsonRaw: "{}",
        packageName: "com.package.name",
        releaseFile: undefined,
        releaseFiles: "./__tests__/releasefiles/*.aab",
        releaseName: "Release name",
        track: "production",
        inAppUpdatePriority: "3",
        userFraction: "0.5",
        status: "inProgress",
        whatsNewDir: "./__tests__/whatsnew",
        mappingFile: undefined,
        debugSymbols: undefined,
        changesNotSentForReview: "true",
        existingEditId: "123"
    })
    await run()
})

test("correct inputs for draft rollout", async () => {
    // Run with the bare minimum
    initInputs({
        serviceAccountJson: undefined,
        serviceAccountJsonRaw: "{}",
        packageName: "com.package.name",
        releaseFile: undefined,
        releaseFiles: "./__tests__/releasefiles/*.aab",
        releaseName: undefined,
        track: "production",
        inAppUpdatePriority: undefined,
        userFraction: undefined,
        status: "draft",
        whatsNewDir: undefined,
        mappingFile: undefined,
        debugSymbols: undefined,
        changesNotSentForReview: undefined,
        existingEditId: undefined
    })
    await run()

    // Test with optional extras
    initInputs({
        serviceAccountJson: undefined,
        serviceAccountJsonRaw: "{}",
        packageName: "com.package.name",
        releaseFile: undefined,
        releaseFiles: "./__tests__/releasefiles/*.aab",
        releaseName: "Release name",
        track: "production",
        inAppUpdatePriority: "3",
        userFraction: undefined,
        status: "draft",
        whatsNewDir: "./__tests__/whatsnew",
        mappingFile: undefined,
        debugSymbols: undefined,
        changesNotSentForReview: "true",
        existingEditId: "123"
    })
    await run()
})
