import * as core from "@actions/core"
import * as fs from "fs"
import { GoogleAuth } from "google-auth-library/build/src/auth/googleauth"

// edits.ts creates its Google Play client when the module loads, so the client is replaced with a module mock.
const uploadDeobfuscationFile = jest.fn()

jest.mock("@googleapis/androidpublisher", () => ({
    androidpublisher: () => ({
        edits: {
            deobfuscationfiles: {
                upload: uploadDeobfuscationFile
            }
        }
    })
}))

// Node does not allow jest.spyOn on fs functions, so readFileSync is wrapped in a module mock instead.
jest.mock("fs", () => {
    const actualFs = jest.requireActual("fs")
    return { ...actualFs, readFileSync: jest.fn(actualFs.readFileSync) }
})

import { EditOptions, uploadMappingFile } from "../src/edits"

describe("uploadMappingFile", () => {
    const mappingFile = './__tests__/mappingfiles/mapping.txt'
    let debugSpy: jest.SpyInstance

    function editOptions(mappingFile: string | undefined): EditOptions {
        return {
            auth: {} as GoogleAuth,
            applicationId: "com.package.name",
            tracks: ["internal"],
            inAppUpdatePriority: 0,
            status: "draft",
            mappingFile: mappingFile
        }
    }

    beforeEach(() => {
        debugSpy = jest.spyOn(core, 'debug').mockImplementation(() => {})
    })

    afterEach(() => {
        debugSpy.mockRestore()
    })

    test("mapping file is streamed to Google Play without being read into memory", async () => {
        await uploadMappingFile("edit-id", 42, editOptions(mappingFile))

        expect(fs.readFileSync).not.toHaveBeenCalled()
        expect(uploadDeobfuscationFile).toHaveBeenCalledTimes(1)
        const request = uploadDeobfuscationFile.mock.calls[0][0]
        expect(request).toMatchObject({
            packageName: "com.package.name",
            editId: "edit-id",
            apkVersionCode: 42,
            deobfuscationFileType: "proguard"
        })
        expect(request.media.body).toBeInstanceOf(fs.ReadStream)
        const chunks: Buffer[] = []
        for await (const chunk of request.media.body) {
            chunks.push(chunk)
        }
        expect(Buffer.concat(chunks).toString()).toBe("com.example.Foo -> a:\n    void bar() -> b\n")
    })

    test("missing mapping file fails before uploading", async () => {
        await expect(uploadMappingFile("edit-id", 42, editOptions('./__tests__/mappingfiles/nonexistent-mapping.txt'))).rejects.toThrow("ENOENT")
        expect(uploadDeobfuscationFile).not.toHaveBeenCalled()
    })

    test("no mapping file means nothing is uploaded", async () => {
        const testValues = [undefined, ""]
        for (const value of testValues) {
            await uploadMappingFile("edit-id", 42, editOptions(value))
        }
        expect(uploadDeobfuscationFile).not.toHaveBeenCalled()
    })
})
