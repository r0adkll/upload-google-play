import {readLocalizedReleaseNotes} from "../src/whatsnew";

test("read localized whatsnew files", async () => {
    let texts = await readLocalizedReleaseNotes("./__tests__/whatsnew");
    expect(texts).toHaveLength(8);
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
    expect(texts).toContainEqual({
        language: "ca",
        text: "test_changelog_file_catalan"
    });
    expect(texts).toContainEqual({
        language: "es-ES",
        text: "test_changelog_file_spanish"
    });
    expect(texts).toContainEqual({
        language: "et",
        text: "test_changelog_file_estonian"
    });
    expect(texts).toContainEqual({
        language: "fr-FR",
        text: "test_changelog_file_french"
    });
    expect(texts).toContainEqual({
        language: "it-IT",
        text: "test_changelog_file_italian"
    });
});

test("read localized whatsnew files excludes invalid files", async () => {
    let texts = await readLocalizedReleaseNotes("./__tests__/whatsnew");
    expect(texts).toBeDefined();
    // Should still be 8, as whatsnew-invalid.txt should not be included
    expect(texts).toHaveLength(8);
    // Ensure no invalid language is included
    const languages = texts!.map(t => t.language);
    expect(languages).not.toContain("invalid");
});

test("read localized whatsnew files with undefined directory", async () => {
    let texts = await readLocalizedReleaseNotes(undefined);
    expect(texts).toBeUndefined();
});

test("read localized whatsnew files with empty directory", async () => {
    let texts = await readLocalizedReleaseNotes("");
    expect(texts).toBeUndefined();
});
