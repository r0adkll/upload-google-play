import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import {readLocalizedReleaseNotes} from "../src/whatsnew";
import {androidpublisher_v3} from "googleapis";
import LocalizedText = androidpublisher_v3.Schema$LocalizedText;

test("read localized whatsnew files", async () => {
    let texts = await readLocalizedReleaseNotes("./__tests__");
    expect(texts).toHaveLength(3);
    expect(texts).toContainEqual({
        language: "en-US",
        text: "test_changelog_file"
    });
    expect(texts).toContainEqual({
        language: "de-DE",
        text: "test_changelog_file_german"
    });
    expect(texts).toContainEqual({
        language: "ja-JP",
        text: "test_changelog_file_japanese"
    });
});