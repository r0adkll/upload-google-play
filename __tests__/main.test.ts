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

function initInputs(
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
) {
    if (serviceAccountJson) {
        process.env.INPUT_SERVICEACCOUNTJSON = serviceAccountJson
    } else {
        delete process.env.INPUT_SERVICEACCOUNTJSON
    }
    if (serviceAccountJsonRaw) {
        process.env.INPUT_SERVICEACCOUNTJSONPLAINTEXT = serviceAccountJsonRaw
    } else {
        delete process.env.INPUT_SERVICEACCOUNTJSONPLAINTEXT
    }
    if (packageName) {
        process.env.INPUT_PACKAGENAME = packageName
    } else {
        delete process.env.INPUT_PACKAGENAME
    }
    if (releaseFile) {
        process.env.INPUT_RELEASEFILE = releaseFile
    } else {
        delete process.env.INPUT_RELEASEFILE
    }
    if (releaseFiles) {
        process.env.INPUT_RELEASEFILES = releaseFiles
    } else {
        delete process.env.INPUT_RELEASEFILES
    }
    if (releaseName) {
        process.env.INPUT_RELEASENAME = releaseName
    } else {
        delete process.env.INPUT_RELEASENAME
    }
    if (track) {
        process.env.INPUT_TRACK = track
    } else {
        delete process.env.INPUT_TRACK
    }
    if (inAppUpdatePriority) {
        process.env.INPUT_INAPPUPDATEPRIORITY = inAppUpdatePriority
    } else {
        delete process.env.INPUT_INAPPUPDATEPRIORITY
    }
    if (userFraction) {
        process.env.INPUT_USERFRACTION = userFraction
    } else {
        delete process.env.INPUT_USERFRACTION
    }
    if (status) {
        process.env.INPUT_STATUS = status
    } else {
        delete process.env.INPUT_STATUS
    }
    if (whatsNewDir) {
        process.env.INPUT_WHATSNEWDIR = whatsNewDir
    } else {
        delete process.env.INPUT_WHATSNEWDIR
    }
    if (mappingFile) {
        process.env.INPUT_MAPPINGFILE = mappingFile
    } else {
        delete process.env.INPUT_MAPPINGFILE
    }
    if (debugSymbols) {
        process.env.INPUT_DEBUGSYMBOLS = debugSymbols
    } else {
        delete process.env.INPUT_DEBUGSYMBOLS
    }
    if (changesNotSentForReview) {
        process.env.INPUT_CHANGESNOTSENTFORREVIEW = changesNotSentForReview
    } else {
        delete process.env.INPUT_CHANGESNOTSENTFORREVIEW
    }
    if (existingEditId) {
        process.env.INPUT_EXISTINGEDITID = existingEditId
    } else {
        delete process.env.INPUT_EXISTINGEDITID
    }
}

test("correct inputs for complete rollout", async () => {
    // Run with the bare minimum
    initInputs(
        undefined,
        "{}",
        "com.package.name",
        undefined,
        "./__tests__/releasefiles/*.aab",
        undefined,
        "production",
        undefined,
        undefined,
        "completed",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
    )
    await run()

    // Test with optional extras
    initInputs(
        undefined,
        "{}",
        "com.package.name",
        undefined,
        "./__tests__/releasefiles/*.aab",
        "Release name",
        "production",
        undefined,
        undefined,
        "completed",
        undefined,
        undefined,
        undefined,
        "true",
        "123"
    )
    await run()
})

test("correct inputs for inProgress rollout", async () => {
    // Run with the bare minimum
    initInputs(
        undefined,
        "{}",
        "com.package.name",
        undefined,
        "./__tests__/releasefiles/*.aab",
        undefined,
        "production",
        "0.99",
        undefined,
        "inProgress",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
    )
    await run()

    // Test with optional extras
    initInputs(
        undefined,
        "{}",
        "com.package.name",
        undefined,
        "./__tests__/releasefiles/*.aab",
        "Release name",
        "production",
        "0.5",
        undefined,
        "inProgress",
        undefined,
        undefined,
        undefined,
        "true",
        "123"
    )
    await run()
})

test("correct inputs for draft rollout", async () => {
    // Run with the bare minimum
    initInputs(
        undefined,
        "{}",
        "com.package.name",
        undefined,
        "./__tests__/releasefiles/*.aab",
        undefined,
        "production",
        undefined,
        undefined,
        "draft",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
    )
    await run()

    // Test with optional extras
    initInputs(
        undefined,
        "{}",
        "com.package.name",
        undefined,
        "./__tests__/releasefiles/*.aab",
        "Release name",
        "draft",
        "0.5",
        undefined,
        "inProgress",
        undefined,
        undefined,
        undefined,
        "true",
        "123"
    )
    await run()
})
