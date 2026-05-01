import * as core from '@actions/core'

const mockEditsInsert = jest.fn()
const mockEditsCommit = jest.fn()
const mockTracksList = jest.fn()
const mockTracksUpdate = jest.fn()
const mockBundlesUpload = jest.fn()
const mockApksUpload = jest.fn()
const mockDeobfuscationUpload = jest.fn()

jest.mock('@googleapis/androidpublisher', () => ({
    androidpublisher: jest.fn(() => ({
        edits: {
            insert: mockEditsInsert,
            commit: mockEditsCommit,
            tracks: { list: mockTracksList, update: mockTracksUpdate },
            bundles: { upload: mockBundlesUpload },
            apks: { upload: mockApksUpload },
            deobfuscationfiles: { upload: mockDeobfuscationUpload }
        },
        internalappsharingartifacts: {
            uploadapk: jest.fn(),
            uploadbundle: jest.fn()
        }
    })),
    auth: {
        GoogleAuth: jest.fn().mockImplementation(() => ({}))
    }
}))

import { runUpload } from '../src/edits'

type RunUploadOverrides = {
    packageName?: string
    tracks?: string[]
    inAppUpdatePriority?: number
    userFraction?: number
    whatsNewDir?: string
    mappingFile?: string
    debugSymbols?: string
    name?: string
    changesNotSentForReview?: boolean
    existingEditId?: string
    status?: string
    validatedReleaseFiles?: string[]
    versionCodesToRetain?: number[]
    commitChanges?: boolean
}

const callRunUpload = (overrides: RunUploadOverrides = {}) => runUpload(
    overrides.packageName ?? 'com.package.name',
    overrides.tracks ?? ['production'],
    overrides.inAppUpdatePriority,
    overrides.userFraction,
    overrides.whatsNewDir,
    overrides.mappingFile,
    overrides.debugSymbols,
    overrides.name,
    overrides.changesNotSentForReview ?? false,
    overrides.existingEditId,
    overrides.status ?? 'completed',
    overrides.validatedReleaseFiles ?? ['./__tests__/releasefiles/release.aab'],
    overrides.versionCodesToRetain,
    overrides.commitChanges ?? true,
)

describe('runUpload commitChanges flag', () => {
    let setOutputSpy: jest.SpyInstance
    let setFailedSpy: jest.SpyInstance
    let infoSpy: jest.SpyInstance

    beforeEach(() => {
        mockEditsInsert.mockResolvedValue({
            status: 200,
            data: { id: 'newly-created-edit-id', expiryTimeSeconds: '54321' }
        })
        mockTracksList.mockResolvedValue({
            status: 200,
            data: { tracks: [{ track: 'production' }] }
        })
        mockBundlesUpload.mockResolvedValue({ data: { versionCode: 42 } })
        mockTracksUpdate.mockResolvedValue({ data: { track: 'production' } })
        mockEditsCommit.mockResolvedValue({
            status: 200,
            statusText: 'OK',
            data: { id: 'committed-id', expiryTimeSeconds: '12345' }
        })
        setOutputSpy = jest.spyOn(core, 'setOutput').mockImplementation(() => { /* swallow */ })
        setFailedSpy = jest.spyOn(core, 'setFailed').mockImplementation(() => { /* swallow */ })
        infoSpy = jest.spyOn(core, 'info').mockImplementation(() => { /* swallow */ })
        jest.spyOn(core, 'debug').mockImplementation(() => { /* swallow */ })
        jest.spyOn(core, 'exportVariable').mockImplementation(() => { /* swallow */ })
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    test('with commitChanges=false and an existing edit, exposes editId, runs upload, and skips commit', async () => {
        await callRunUpload({
            existingEditId: 'existing-edit-id-123',
            commitChanges: false,
        })

        expect(mockEditsInsert).not.toHaveBeenCalled()
        expect(mockBundlesUpload).toHaveBeenCalled()
        expect(mockTracksUpdate).toHaveBeenCalled()
        expect(setOutputSpy).toHaveBeenCalledWith('editId', 'existing-edit-id-123')
        expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping commit'))
        expect(mockEditsCommit).not.toHaveBeenCalled()
        expect(setFailedSpy).not.toHaveBeenCalled()
    })

    test('with commitChanges=false and no existing edit, creates a new edit, runs upload, and skips commit', async () => {
        await callRunUpload({ commitChanges: false })

        expect(mockEditsInsert).toHaveBeenCalled()
        expect(mockBundlesUpload).toHaveBeenCalled()
        expect(mockTracksUpdate).toHaveBeenCalled()
        expect(setOutputSpy).toHaveBeenCalledWith('editId', 'newly-created-edit-id')
        expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping commit'))
        expect(mockEditsCommit).not.toHaveBeenCalled()
        expect(setFailedSpy).not.toHaveBeenCalled()
    })

    test('with commitChanges=true and an existing edit, commits that edit and exposes the committed id', async () => {
        await callRunUpload({
            existingEditId: 'existing-edit-id-456',
            commitChanges: true,
        })

        expect(mockEditsInsert).not.toHaveBeenCalled()
        expect(setOutputSpy).toHaveBeenCalledWith('editId', 'existing-edit-id-456')
        expect(mockEditsCommit).toHaveBeenCalledWith(expect.objectContaining({
            editId: 'existing-edit-id-456',
            packageName: 'com.package.name',
            changesNotSentForReview: false,
        }))
        expect(setOutputSpy).toHaveBeenCalledWith('committedEditId', 'committed-id')
        expect(setFailedSpy).not.toHaveBeenCalled()
    })

    test('with commitChanges=true and no existing edit, creates a new edit, uploads, and commits it', async () => {
        await callRunUpload({ commitChanges: true })

        expect(mockEditsInsert).toHaveBeenCalled()
        expect(mockBundlesUpload).toHaveBeenCalled()
        expect(mockTracksUpdate).toHaveBeenCalled()
        expect(setOutputSpy).toHaveBeenCalledWith('editId', 'newly-created-edit-id')
        expect(mockEditsCommit).toHaveBeenCalledWith(expect.objectContaining({
            editId: 'newly-created-edit-id',
            packageName: 'com.package.name',
            changesNotSentForReview: false,
        }))
        expect(setOutputSpy).toHaveBeenCalledWith('committedEditId', 'committed-id')
        expect(setFailedSpy).not.toHaveBeenCalled()
    })

    test('when commit returns no id, surfaces failure via setFailed', async () => {
        mockEditsCommit.mockResolvedValue({
            status: 500,
            statusText: 'Internal Server Error',
            data: {}
        })

        await expect(callRunUpload({ commitChanges: true })).rejects.toBe(500)

        expect(mockEditsCommit).toHaveBeenCalled()
        expect(setFailedSpy).toHaveBeenCalledWith(expect.stringContaining('Internal Server Error'))
        expect(setOutputSpy).not.toHaveBeenCalledWith('committedEditId', expect.anything())
    })
})
