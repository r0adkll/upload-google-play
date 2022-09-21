import { validateInAppUpdatePriority, validateReleaseFiles, validateStatus, validateUserFraction } from "../src/input-validation"

test("invalid in-app update priority fails validation", async () => {
    const testValues = [-1, 6, -1000, 1000]
    for (const value of testValues) {
        await expect(validateInAppUpdatePriority(value)).rejects.toThrowError()
    }
})

test("valid in-app update priority passes validation", async () => {
    const testValues = [0, 1, 2, 3, 4, 5, undefined]
    for (const value of testValues) {
        await validateInAppUpdatePriority(value)
    }
})

test("invalid releaseFiles glob fails validation", async () => {
    const testValues = ['./__tests__/releasefiles/*.null', `./__tests__/releasefiles/nonexistent-release.aab`]
    await expect(validateReleaseFiles(testValues)).rejects.toThrowError()
})

test("valid releaseFiles glob passes validation", async () => {
    const testValues = ['./__tests__/releasefiles/*.aab', `./__tests__/releasefiles/release.aab`]
    await validateReleaseFiles(testValues)
})

test("fractionless status without fraction passes validation", async () => {
    const testValues = ['completed', 'draft']
    for (const value of testValues) {
        await validateStatus(value, false)
    }
})

test("fractionless status with fraction fails validation", async () => {
    const testValues = ['completed', 'draft']
    for (const value of testValues) {
        await expect(validateStatus(value, true)).rejects.toThrowError()
    }
})

test("fractioned status without fraction fails validation", async () => {
    const testValues = ['inProgress', 'halted']
    for (const value of testValues) {
        await expect(validateStatus(value, false)).rejects.toThrowError()
    }
})

test("fractioned status with fraction passes validation", async () => {
    const testValues = ['inProgress', 'halted']
    for (const value of testValues) {
        await validateStatus(value, true)
    }
})

test("invalid status fails validation", async () => {
    const testValues = ['statusGoBrrr', undefined]
    for (const value of testValues) {
        await expect(validateStatus(value, true)).rejects.toThrowError()
    }
})

test("invalid user fraction fails validation", async () => {
    const testValues = [0, 1, -1, 2, NaN]
    for (const value of testValues) {
        await expect(validateUserFraction(value)).rejects.toThrowError()
    }
})

test("valid user fraction passes validation", async () => {
    const testValues = [0.1, 0.9, 0.5, undefined]
    for (const value of testValues) {
        await validateUserFraction(value)
    }
})
