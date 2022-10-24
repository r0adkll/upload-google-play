import {RunOptions, RunTarget} from 'github-action-ts-run-api';

const target = RunTarget.mainJs('action.yml');

async function expectRunInitiatesUpload(options: RunOptions) {
    const result = await target.run(options)
    expect(result.commands.errors.length).toBe(1)
    expect(result.commands.errors).toContainEqual("The incoming JSON object does not contain a client_email field")
}

test("correct inputs for complete rollout", async () => {
    // Run with the bare minimum
    const minimumOptions = RunOptions.create()
        .setInputs({
            serviceAccountJsonPlainText: "{}",
            packageName: "com.package.name",
            releaseFiles: "./__tests__/releasefiles/*.aab",
            track: "production",
            status: "completed",
        })
    await expectRunInitiatesUpload(minimumOptions)

    // Test with optional extras
    const extraOptions = RunOptions.create()
        .setInputs({
            serviceAccountJsonPlainText: "{}",
            packageName: "com.package.name",
            releaseFiles: "./__tests__/releasefiles/*.aab",
            releaseName: "Release name",
            track: "production",
            inAppUpdatePriority: "3",
            status: "completed",
            whatsNewDir: "./__tests__/whatsnew",
            changesNotSentForReview: "true",
            existingEditId: "123"
        })
        await expectRunInitiatesUpload(extraOptions)
    })

test("correct inputs for inProgress rollout", async () => {
    // Run with the bare minimum
    const minimumOptions = RunOptions.create()
        .setInputs({
            serviceAccountJsonPlainText: "{}",
            packageName: "com.package.name",
            releaseFiles: "./__tests__/releasefiles/*.aab",
            track: "production",
            userFraction: "0.99",
            status: "inProgress",
        })
        await expectRunInitiatesUpload(minimumOptions)

    // Test with optional extras
    const extraOptions = RunOptions.create()
        .setInputs({
            serviceAccountJsonPlainText: "{}",
            packageName: "com.package.name",
            releaseFiles: "./__tests__/releasefiles/*.aab",
            releaseName: "Release name",
            track: "production",
            inAppUpdatePriority: "3",
            userFraction: "0.5",
            status: "inProgress",
            whatsNewDir: "./__tests__/whatsnew",
            changesNotSentForReview: "true",
            existingEditId: "123"
        })
        await expectRunInitiatesUpload(extraOptions)
})

test("correct inputs for draft rollout", async () => {
    // Run with the bare minimum
    const minimumOptions = RunOptions.create()
        .setInputs({
            serviceAccountJsonPlainText: "{}",
            packageName: "com.package.name",
            releaseFiles: "./__tests__/releasefiles/*.aab",
            track: "production",
            status: "draft",
        })
        await expectRunInitiatesUpload(minimumOptions)

    // Test with optional extras
    const extraOptions = RunOptions.create()
        .setInputs({
            serviceAccountJsonPlainText: "{}",
            packageName: "com.package.name",
            releaseFiles: "./__tests__/releasefiles/*.aab",
            releaseName: "Release name",
            track: "production",
            inAppUpdatePriority: "3",
            status: "draft",
            whatsNewDir: "./__tests__/whatsnew",
            changesNotSentForReview: "true",
            existingEditId: "123"
        })
        await expectRunInitiatesUpload(extraOptions)
    })
