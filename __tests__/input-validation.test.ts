import { validateInAppUpdatePriority, validateReleaseFiles } from "../src/input-validation"

test("invalid in-app update priority fails validation", () => {
    const testValues = [-1, 6, -1000, 1000]
    testValues.forEach((value) => {
        const errorMessage = validateInAppUpdatePriority(value)
        expect(errorMessage).toBeDefined()
    })
})

test("valid in-app update priority passes validation", () => {
    const testValues = [0, 1, 2, 3, 4, 5, undefined]
    testValues.forEach((value) => {
        const errorMessage = validateInAppUpdatePriority(value)
        expect(errorMessage).toBeUndefined()
    })
})

test("invalid releaseFiles glob fails validation", async () => {
    const invalidGlobs = ['./__tests__/releasefiles/*.null', `./__tests__/releasefiles/nonexistent-release.aab`]
    const errorMessage = await validateReleaseFiles(invalidGlobs)
    expect(errorMessage).toBeDefined()
})

test("valid releaseFiles glob passes validation", async () => {
    const invalidGlobs = ['./__tests__/releasefiles/*.aab', `./__tests__/releasefiles/release.aab`]
    const errorMessage = await validateReleaseFiles(invalidGlobs)
    expect(errorMessage).toBeUndefined()
})
