import * as core from "@actions/core"
import { validateInAppUpdatePriority, validateReleaseFiles, validateStatus, validateTracks, validateUserFraction } from "../src/input-validation"

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
    await expect(validateReleaseFiles(undefined, testValues)).rejects.toThrowError()
})

test("valid releaseFiles glob passes validation", async () => {
    const testValues = ['./__tests__/releasefiles/*.aab', `./__tests__/releasefiles/release.aab`]
    await validateReleaseFiles(undefined, testValues)
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

describe("validateTracks", () => {
    let warningSpy: jest.SpyInstance

    beforeEach(() => {
        warningSpy = jest.spyOn(core, 'warning').mockImplementation(() => {})
    })

    afterEach(() => {
        warningSpy.mockRestore()
    })

    test("deprecated 'track' is respected and emits a deprecation warning", async () => {
        await expect(validateTracks("internal", [])).resolves.toEqual(["internal"])
        expect(warningSpy).toHaveBeenCalledWith(
            "WARNING!! 'track' is deprecated and will be removed in a future release. Please migrate to 'tracks'"
        )
    })

    test("'tracks' alone is returned verbatim without a deprecation warning", async () => {
        await expect(validateTracks(undefined, ["internal", "beta"])).resolves.toEqual(["internal", "beta"])
        expect(warningSpy).not.toHaveBeenCalled()
    })

    test("setting both 'track' and 'tracks' rejects with a clear error", async () => {
        await expect(validateTracks("internal", ["production"])).rejects.toThrowError(
            "Cannot set both 'track' and 'tracks'. 'track' is deprecated — please migrate fully to 'tracks'."
        )
    })

    test("omitting both defaults to 'production' without a deprecation warning", async () => {
        await expect(validateTracks(undefined, [])).resolves.toEqual(["production"])
        expect(warningSpy).not.toHaveBeenCalled()
    })

    test("empty-string 'track' is treated as unset", async () => {
        await expect(validateTracks("", ["beta"])).resolves.toEqual(["beta"])
        expect(warningSpy).not.toHaveBeenCalled()
    })
})

describe("validateReleaseFiles", () => {
    const validGlob = './__tests__/releasefiles/*.aab'
    const validFile = './__tests__/releasefiles/release.aab'
    const deprecationWarning = "WARNING!! 'releaseFile' is deprecated and will be removed in a future release. Please migrate to 'releaseFiles'"
    let warningSpy: jest.SpyInstance

    beforeEach(() => {
        warningSpy = jest.spyOn(core, 'warning').mockImplementation(() => {})
    })

    afterEach(() => {
        warningSpy.mockRestore()
    })

    test("deprecated 'releaseFile' is respected and emits a deprecation warning", async () => {
        await expect(validateReleaseFiles(validFile, [])).resolves.toEqual([validFile])
        expect(warningSpy).toHaveBeenCalledWith(deprecationWarning)
    })

    test("'releaseFiles' alone is globbed without a deprecation warning", async () => {
        const result = await validateReleaseFiles(undefined, [validGlob])
        expect(result.length).toBeGreaterThan(0)
        expect(warningSpy).not.toHaveBeenCalled()
    })

    test("setting both 'releaseFile' and 'releaseFiles' rejects with a clear error", async () => {
        await expect(validateReleaseFiles(validFile, [validGlob])).rejects.toThrowError(
            "Cannot set both 'releaseFile' and 'releaseFiles'. 'releaseFile' is deprecated — please migrate fully to 'releaseFiles'."
        )
    })

    test("omitting both rejects with a 'must provide' error", async () => {
        await expect(validateReleaseFiles(undefined, [])).rejects.toThrowError(
            "You must provide 'releaseFiles' in your configuration"
        )
    })

    test("empty-string 'releaseFile' is treated as unset", async () => {
        const result = await validateReleaseFiles("", [validGlob])
        expect(result.length).toBeGreaterThan(0)
        expect(warningSpy).not.toHaveBeenCalled()
    })
})
