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

describe('runUpload commitChanges flag', () => {
    let setOutputSpy: jest.SpyInstance
    let infoSpy: jest.SpyInstance

    beforeEach(() => {
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
        infoSpy = jest.spyOn(core, 'info').mockImplementation(() => { /* swallow */ })
        jest.spyOn(core, 'debug').mockImplementation(() => { /* swallow */ })
        jest.spyOn(core, 'exportVariable').mockImplementation(() => { /* swallow */ })
    })

    test('with commitChanges=false, exposes editId output and skips the commit', async () => {
        await runUpload(
            'com.package.name',
            ['production'],
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            false,
            'existing-edit-id-123',
            'completed',
            ['./__tests__/releasefiles/release.aab'],
            undefined,
            false
        )

        expect(setOutputSpy).toHaveBeenCalledWith('editId', 'existing-edit-id-123')
        expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping commit'))
        expect(editsCommitMock).not.toHaveBeenCalled()
    })

    test('with commitChanges=true, commits the edit', async () => {
        await runUpload(
            'com.package.name',
            ['production'],
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            false,
            'existing-edit-id-456',
            'completed',
            ['./__tests__/releasefiles/release.aab'],
            undefined,
            true
        )

        expect(setOutputSpy).toHaveBeenCalledWith('editId', 'existing-edit-id-456')
        expect(editsCommitMock).toHaveBeenCalled()
    })
})
