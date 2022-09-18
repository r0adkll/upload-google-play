import { validateInAppUpdatePriority, validateReleaseFiles, validateStatus, validateUserFraction } from "../src/input-validation"

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
    const testValues = ['./__tests__/releasefiles/*.null', `./__tests__/releasefiles/nonexistent-release.aab`]
    const errorMessage = await validateReleaseFiles(testValues)
    expect(errorMessage).toBeDefined()
})

test("valid releaseFiles glob passes validation", async () => {
    const testValues = ['./__tests__/releasefiles/*.aab', `./__tests__/releasefiles/release.aab`]
    const errorMessage = await validateReleaseFiles(testValues)
    expect(errorMessage).toBeUndefined()
})

test("fractionless status without fraction passes validation", () => {
    const testValues = ['completed', 'draft']
    testValues.forEach((status) => {
        const errorMessage = validateStatus(status, false)
        expect(errorMessage).toBeUndefined()
    })
})

test("fractionless status with fraction fails validation", () => {
    const testValues = ['completed', 'draft']
    testValues.forEach((status) => {
        const errorMessage = validateStatus(status, true)
        expect(errorMessage).toBeDefined()
    })
})

test("fractioned status without fraction fails validation", () => {
    const testValues = ['inProgress', 'halted']
    testValues.forEach((status) => {
        const errorMessage = validateStatus(status, false)
        expect(errorMessage).toBeDefined()
    })
})

test("fractioned status with fraction passes validation", () => {
    const testValues = ['inProgress', 'halted']
    testValues.forEach((status) => {
        const errorMessage = validateStatus(status, true)
        expect(errorMessage).toBeUndefined()
    })
})

test("invalid status fails validation", () => {
    const testValues = ['statusGoBrrr', undefined]
    testValues.forEach((status) => {
        const errorMessage = validateStatus(status, true)
        expect(errorMessage).toBeDefined()
    })
})

test("invalid user fraction fails validation", () => {
    const testValues = [0, 1, -1, 2, NaN]
    testValues.forEach((fraction) => {
        const errorMessage = validateUserFraction(fraction)
        expect(errorMessage).toBeDefined()
    })
})

test("valid user fraction passes validation", () => {
    const testValues = [0.1, 0.9, 0.5, undefined]
    testValues.forEach((fraction) => {
        const errorMessage = validateUserFraction(fraction)
        expect(errorMessage).toBeUndefined()
    })
})
