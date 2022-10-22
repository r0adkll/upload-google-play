import { run } from "../src/main"

jest.mock("../src/edits", () => {
    const originalModule = jest.requireActual("../src/edits")

    return {
        __esModule: true,
        ...originalModule,
        runUpload: Promise.resolve()
    }
})

function initInputs(
    serviceAccountJson: string | undefined = undefined,
    serviceAccountJsonRaw: string | undefined = undefined,
    packageName: string | undefined = undefined,
    releaseFile: string | undefined = undefined,
    releaseFiles: string | undefined = undefined,
    releaseName: string | undefined = undefined,
    track: string | undefined = undefined,
    inAppUpdatePriority: string | undefined = undefined,
    userFraction: string | undefined = undefined,
    status: string | undefined = undefined,
    whatsNewDir: string | undefined = undefined,
    mappingFile: string | undefined = undefined,
    debugSymbols: string | undefined = undefined,
    changesNotSentForReview: string | undefined = undefined,
    existingEditId: string | undefined = undefined,
) {
    process.env.INPUT_SERVICEACCOUNTJSON = serviceAccountJson
    process.env.INPUT_SERVICEACCOUNTJSONRAW = serviceAccountJsonRaw
    process.env.INPUT_PACKAGENAME = packageName
    process.env.INPUT_RELEASEFILE = releaseFile
    process.env.INPUT_RELEASEFILES = releaseFiles
    process.env.INPUT_RELEASENAME = releaseName
    process.env.INPUT_TRACK = track
    process.env.INPUT_INAPPUPDATEPRIORITY = inAppUpdatePriority
    process.env.INPUT_USERFRACTION = userFraction
    process.env.INPUT_STATUS = status
    process.env.INPUT_WHATSNEWDIR = whatsNewDir
    process.env.INPUT_MAPPINGFILE = mappingFile
    process.env.INPUT_DEBUGSYMBOLS = debugSymbols
    process.env.INPUT_CHANGESNOTSENTFORREVIEW = changesNotSentForReview
    process.env.INPUT_EXISTINGEDITID = existingEditId
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

    // Run with changesNotSentForReview specified
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
        "false",
        undefined
    )
    await run()
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
        "true",
        undefined
    )
    await run()

    // Test with release name
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
        undefined,
        undefined
    )
    await run()
})
