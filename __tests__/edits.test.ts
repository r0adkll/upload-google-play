import * as core from '@actions/core'

const editsInsertMock = jest.fn()
const editsCommitMock = jest.fn()
const tracksListMock = jest.fn()
const tracksUpdateMock = jest.fn()
const bundlesUploadMock = jest.fn()
const apksUploadMock = jest.fn()
const deobfuscationUploadMock = jest.fn()

jest.mock('@googleapis/androidpublisher', () => ({
    androidpublisher: jest.fn(() => ({
        edits: {
            insert: editsInsertMock,
            commit: editsCommitMock,
            tracks: { list: tracksListMock, update: tracksUpdateMock },
            bundles: { upload: bundlesUploadMock },
            apks: { upload: apksUploadMock },
            deobfuscationfiles: { upload: deobfuscationUploadMock }
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
        editsInsertMock.mockResolvedValue({
            status: 200,
            data: { id: 'newly-created-edit-id', expiryTimeSeconds: '54321' }
        })
        tracksListMock.mockResolvedValue({
            status: 200,
            data: { tracks: [{ track: 'production' }] }
        })
        bundlesUploadMock.mockResolvedValue({ data: { versionCode: 42 } })
        tracksUpdateMock.mockResolvedValue({ data: { track: 'production' } })
        editsCommitMock.mockResolvedValue({
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

        expect(editsInsertMock).not.toHaveBeenCalled()
        expect(bundlesUploadMock).toHaveBeenCalled()
        expect(tracksUpdateMock).toHaveBeenCalled()
        expect(setOutputSpy).toHaveBeenCalledWith('editId', 'existing-edit-id-123')
        expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping commit'))
        expect(editsCommitMock).not.toHaveBeenCalled()
        expect(setFailedSpy).not.toHaveBeenCalled()
    })

    test('with commitChanges=false and no existing edit, creates a new edit and exposes its id', async () => {
        await callRunUpload({ commitChanges: false })

        expect(editsInsertMock).toHaveBeenCalled()
        expect(setOutputSpy).toHaveBeenCalledWith('editId', 'newly-created-edit-id')
        expect(editsCommitMock).not.toHaveBeenCalled()
        expect(setFailedSpy).not.toHaveBeenCalled()
    })

    test('with commitChanges=true and an existing edit, commits that edit and exposes the committed id', async () => {
        await callRunUpload({
            existingEditId: 'existing-edit-id-456',
            commitChanges: true,
        })

        expect(editsInsertMock).not.toHaveBeenCalled()
        expect(setOutputSpy).toHaveBeenCalledWith('editId', 'existing-edit-id-456')
        expect(editsCommitMock).toHaveBeenCalledWith(expect.objectContaining({
            editId: 'existing-edit-id-456',
            packageName: 'com.package.name',
            changesNotSentForReview: false,
        }))
        expect(setOutputSpy).toHaveBeenCalledWith('committedEditId', 'committed-id')
        expect(setFailedSpy).not.toHaveBeenCalled()
    })
})
