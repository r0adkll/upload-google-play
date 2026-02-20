import {readLocalizedReleaseNotes} from "../src/whatsnew";

test("read localized whatsnew files", async () => {
    let texts = await readLocalizedReleaseNotes("./__tests__/whatsnew");
    expect(texts).toHaveLength(8);
    const expectedChangelogs = [
        { language: "en-US", text: "test_changelog_file" },
        { language: "de-DE", text: "test_changelog_file_german" },
        { language: "ja-JP", text: "test_changelog_file_japanese" },
        { language: "ca", text: "test_changelog_file_catalan" },
        { language: "es-ES", text: "test_changelog_file_spanish" },
        { language: "et", text: "test_changelog_file_estonian" },
        { language: "fr-FR", text: "test_changelog_file_french" },
        { language: "it-IT", text: "test_changelog_file_italian" },
    ];
    expect(texts).toEqual(expect.arrayContaining(expectedChangelogs));
    // Ensure no invalid language is included
    const languages = texts!.map((t) => t.language);
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
