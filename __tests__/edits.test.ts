jest.mock('@googleapis/androidpublisher', () => {
    const publisher = {
        edits: {
            insert: jest.fn(),
            commit: jest.fn(),
            tracks: {
                list: jest.fn(),
                update: jest.fn(),
            },
            apks: { upload: jest.fn() },
            bundles: { upload: jest.fn() },
            deobfuscationfiles: { upload: jest.fn() },
        },
        internalappsharingartifacts: {
            uploadapk: jest.fn(),
            uploadbundle: jest.fn(),
        },
    };
    return {
        androidpublisher: jest.fn(() => publisher),
        auth: {
            GoogleAuth: jest.fn().mockImplementation(() => ({ scopes: [] })),
        },
    };
});

jest.mock('@actions/core', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    setFailed: jest.fn(),
    setOutput: jest.fn(),
    exportVariable: jest.fn(),
}));

import * as google from '@googleapis/androidpublisher';
import * as core from '@actions/core';
import { runUpload } from '../src/edits';

const APK_FIXTURE = './__tests__/releasefiles/release.apk';
const AAB_FIXTURE = './__tests__/releasefiles/release.aab';
const WHATS_NEW_DIR = './__tests__/whatsnew';

const publisher: any = (google.androidpublisher as jest.Mock).mock.results[0].value;
const edits = publisher.edits;
const internalSharing = publisher.internalappsharingartifacts;

type BaseArgs = Parameters<typeof runUpload>;

function callRunUpload(overrides: Partial<{
    packageName: string;
    tracks: string[];
    inAppUpdatePriority: number | undefined;
    userFraction: number | undefined;
    whatsNewDir: string | undefined;
    mappingFile: string | undefined;
    debugSymbols: string | undefined;
    name: string | undefined;
    changesNotSentForReview: boolean;
    existingEditId: string | undefined;
    status: string;
    releaseFiles: string[];
    versionCodesToRetain: number[] | undefined;
}> = {}) {
    const args: BaseArgs = [
        overrides.packageName ?? 'com.example.app',
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
        overrides.releaseFiles ?? [AAB_FIXTURE],
        overrides.versionCodesToRetain,
    ];
    return runUpload(...args);
}

function setupHappyPathMocks() {
    edits.insert.mockResolvedValue({
        status: 200,
        data: { id: 'edit-1', expiryTimeSeconds: '12345' },
    });
    edits.tracks.list.mockResolvedValue({
        status: 200,
        data: { tracks: [{ track: 'production' }, { track: 'beta' }, { track: 'alpha' }] },
    });
    edits.tracks.update.mockImplementation((params: any) =>
        Promise.resolve({ status: 200, data: { track: params.track, releases: params.requestBody.releases } })
    );
    edits.apks.upload.mockResolvedValue({ status: 200, data: { versionCode: 42 } });
    edits.bundles.upload.mockResolvedValue({ status: 200, data: { versionCode: 43 } });
    edits.deobfuscationfiles.upload.mockResolvedValue({ status: 200, data: {} });
    edits.commit.mockResolvedValue({
        status: 200,
        data: { id: 'committed-id', expiryTimeSeconds: '54321' },
    });
    internalSharing.uploadapk.mockResolvedValue({ data: { downloadUrl: 'https://example/apk' } });
    internalSharing.uploadbundle.mockResolvedValue({ data: { downloadUrl: 'https://example/aab' } });
}

beforeEach(() => {
    setupHappyPathMocks();
});

describe('standard track flow', () => {
    test('creates edit, uploads bundle, updates track, and commits', async () => {
        await callRunUpload();

        expect(edits.insert).toHaveBeenCalledTimes(1);
        expect(edits.insert).toHaveBeenCalledWith(expect.objectContaining({
            packageName: 'com.example.app',
        }));

        expect(edits.tracks.list).toHaveBeenCalledTimes(1);
        expect(edits.bundles.upload).toHaveBeenCalledTimes(1);
        expect(edits.apks.upload).not.toHaveBeenCalled();

        expect(edits.tracks.update).toHaveBeenCalledTimes(1);
        expect(edits.tracks.update).toHaveBeenCalledWith(expect.objectContaining({
            editId: 'edit-1',
            track: 'production',
            packageName: 'com.example.app',
            requestBody: expect.objectContaining({
                track: 'production',
                releases: [expect.objectContaining({
                    status: 'completed',
                    versionCodes: ['43'],
                })],
            }),
        }));

        expect(edits.commit).toHaveBeenCalledWith(expect.objectContaining({
            editId: 'edit-1',
            packageName: 'com.example.app',
            changesNotSentForReview: false,
        }));

        expect(core.setOutput).toHaveBeenCalledWith('committedEditId', 'committed-id');
        expect(core.setOutput).toHaveBeenCalledWith('commitedEditIdExpiryTimeSeconds', '54321');
        expect(core.setOutput).toHaveBeenCalledWith(
            'internalSharingDownloadUrl',
            'https://play.google.com/apps/test/com.example.app/43'
        );
    });

    test('uploads APK and reports its versionCode', async () => {
        await callRunUpload({ releaseFiles: [APK_FIXTURE] });

        expect(edits.apks.upload).toHaveBeenCalledTimes(1);
        expect(edits.bundles.upload).not.toHaveBeenCalled();
        expect(edits.tracks.update).toHaveBeenCalledWith(expect.objectContaining({
            requestBody: expect.objectContaining({
                releases: [expect.objectContaining({ versionCodes: ['42'] })],
            }),
        }));
    });

    test('updates each track when multiple tracks are provided', async () => {
        await callRunUpload({ tracks: ['production', 'beta'] });

        expect(edits.tracks.update).toHaveBeenCalledTimes(2);
        const tracks = edits.tracks.update.mock.calls.map((c: any[]) => c[0].track);
        expect(tracks).toEqual(['production', 'beta']);
    });

    test('passes userFraction, inAppUpdatePriority, name, and release notes', async () => {
        await callRunUpload({
            status: 'inProgress',
            userFraction: 0.5,
            inAppUpdatePriority: 3,
            name: 'Release v1',
            whatsNewDir: WHATS_NEW_DIR,
        });

        const requestBody = edits.tracks.update.mock.calls[0][0].requestBody;
        const release = requestBody.releases[0];
        expect(release).toMatchObject({
            status: 'inProgress',
            userFraction: 0.5,
            inAppUpdatePriority: 3,
            name: 'Release v1',
        });
        expect(release.releaseNotes).toEqual(expect.arrayContaining([
            expect.objectContaining({ language: 'en-US' }),
            expect.objectContaining({ language: 'de-DE' }),
        ]));
    });

    test('merges versionCodesToRetain with uploaded versionCodes', async () => {
        await callRunUpload({
            releaseFiles: [APK_FIXTURE],
            versionCodesToRetain: [100, 200],
        });

        const releases = edits.tracks.update.mock.calls[0][0].requestBody.releases;
        expect(releases[0].versionCodes).toEqual(['42', '100', '200']);
    });

    test('filters zero version codes out of the release', async () => {
        edits.apks.upload.mockResolvedValueOnce({ status: 200, data: { versionCode: 42 } });
        await callRunUpload({
            releaseFiles: [APK_FIXTURE],
            versionCodesToRetain: [0, 77],
        });

        const releases = edits.tracks.update.mock.calls[0][0].requestBody.releases;
        expect(releases[0].versionCodes).toEqual(['42', '77']);
    });

    test('propagates changesNotSentForReview to commit', async () => {
        await callRunUpload({ changesNotSentForReview: true });
        expect(edits.commit).toHaveBeenCalledWith(expect.objectContaining({
            changesNotSentForReview: true,
        }));
    });
});

describe('track validation and edit id', () => {
    test('reuses existingEditId instead of creating a new edit', async () => {
        await callRunUpload({ existingEditId: 'reuse-me' });

        expect(edits.insert).not.toHaveBeenCalled();
        expect(edits.commit).toHaveBeenCalledWith(expect.objectContaining({
            editId: 'reuse-me',
        }));
    });

    test('throws when an unknown track is requested', async () => {
        await expect(callRunUpload({ tracks: ['bogus'] })).rejects.toThrow(/bogus/);
        expect(edits.bundles.upload).not.toHaveBeenCalled();
        expect(edits.commit).not.toHaveBeenCalled();
    });

    test('throws when the api returns no tracks', async () => {
        edits.tracks.list.mockResolvedValueOnce({ status: 200, data: {} });
        await expect(callRunUpload()).rejects.toThrow(/No Google Play tracks/);
    });

    test('throws when track list returns non-200', async () => {
        edits.tracks.list.mockResolvedValueOnce({ status: 403, statusText: 'Forbidden', data: {} });
        await expect(callRunUpload()).rejects.toThrow('Forbidden');
    });

    test('throws when internalsharing is mixed with other tracks', async () => {
        await expect(
            callRunUpload({ tracks: ['production', 'internalsharing'] })
        ).rejects.toThrow(/internalsharing/);
    });

    test('throws when edit insert returns non-200', async () => {
        edits.insert.mockResolvedValueOnce({ status: 500, statusText: 'Server Error', data: {} });
        await expect(callRunUpload()).rejects.toThrow('Server Error');
    });

    test('throws when edit insert returns no id', async () => {
        edits.insert.mockResolvedValueOnce({ status: 200, data: {} });
        await expect(callRunUpload()).rejects.toThrow(/no ID/);
    });
});

describe('internal sharing flow', () => {
    test('uploads apk via internalappsharingartifacts', async () => {
        await callRunUpload({ tracks: ['internalsharing'], releaseFiles: [APK_FIXTURE] });

        expect(internalSharing.uploadapk).toHaveBeenCalledTimes(1);
        expect(internalSharing.uploadbundle).not.toHaveBeenCalled();
        expect(edits.insert).not.toHaveBeenCalled();
        expect(edits.commit).not.toHaveBeenCalled();

        expect(core.setOutput).toHaveBeenCalledWith('internalSharingDownloadUrl', 'https://example/apk');
    });

    test('uploads aab via internalappsharingartifacts', async () => {
        await callRunUpload({ tracks: ['internalsharing'], releaseFiles: [AAB_FIXTURE] });

        expect(internalSharing.uploadbundle).toHaveBeenCalledTimes(1);
        expect(internalSharing.uploadapk).not.toHaveBeenCalled();
    });

    test('throws on unsupported file extension', async () => {
        await expect(
            callRunUpload({ tracks: ['internalsharing'], releaseFiles: ['./__tests__/releasefiles/release.txt'] })
        ).rejects.toThrow(/invalid/);
    });

    test('throws when uploaded artifact has no downloadUrl', async () => {
        internalSharing.uploadbundle.mockResolvedValueOnce({ data: {} });
        await expect(
            callRunUpload({ tracks: ['internalsharing'], releaseFiles: [AAB_FIXTURE] })
        ).rejects.toThrow(/no download URL/);
    });
});

describe('auxiliary uploads and commit failure', () => {
    test('uploads mapping file when supplied', async () => {
        await callRunUpload({
            releaseFiles: [APK_FIXTURE],
            mappingFile: APK_FIXTURE,
        });

        expect(edits.deobfuscationfiles.upload).toHaveBeenCalledWith(expect.objectContaining({
            apkVersionCode: 42,
            deobfuscationFileType: 'proguard',
        }));
    });

    test('skips mapping file upload when not supplied', async () => {
        await callRunUpload({ releaseFiles: [APK_FIXTURE] });
        const proguardCalls = edits.deobfuscationfiles.upload.mock.calls.filter(
            (c: any[]) => c[0].deobfuscationFileType === 'proguard'
        );
        expect(proguardCalls).toHaveLength(0);
    });

    test('uploads debug symbols file when supplied as a file path', async () => {
        await callRunUpload({
            releaseFiles: [APK_FIXTURE],
            debugSymbols: APK_FIXTURE,
        });

        expect(edits.deobfuscationfiles.upload).toHaveBeenCalledWith(expect.objectContaining({
            apkVersionCode: 42,
            deobfuscationFileType: 'nativeCode',
        }));
    });

    test('uploads debug symbols by zipping a directory', async () => {
        await callRunUpload({
            releaseFiles: [APK_FIXTURE],
            debugSymbols: WHATS_NEW_DIR,
        });

        expect(edits.deobfuscationfiles.upload).toHaveBeenCalledWith(expect.objectContaining({
            apkVersionCode: 42,
            deobfuscationFileType: 'nativeCode',
        }));
    });

    test('throws when apk upload returns no versionCode', async () => {
        edits.apks.upload.mockResolvedValueOnce({ status: 200, data: {} });
        await expect(callRunUpload({ releaseFiles: [APK_FIXTURE] })).rejects.toThrow(/Failed to upload APK/);
    });

    test('throws when bundle upload returns no versionCode', async () => {
        edits.bundles.upload.mockResolvedValueOnce({ status: 200, data: {} });
        await expect(callRunUpload({ releaseFiles: [AAB_FIXTURE] })).rejects.toThrow(/Failed to upload bundle/);
    });

    test('throws on unrecognised release file extension', async () => {
        await expect(
            callRunUpload({ releaseFiles: ['./__tests__/releasefiles/release.zip'] })
        ).rejects.toThrow(/invalid/);
    });

    test('rejects when commit returns no id and reports failure', async () => {
        edits.commit.mockResolvedValueOnce({ status: 500, statusText: 'Server Error', data: {} });
        await expect(callRunUpload()).rejects.toBe(500);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('500'));
    });
});
