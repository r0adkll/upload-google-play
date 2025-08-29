import * as core from "@actions/core";
import * as fs from "fs";
import * as path from "path";
import { androidpublisher_v3 } from "@googleapis/androidpublisher";
import LocalizedText = androidpublisher_v3.Schema$LocalizedText;
import { readFile } from "fs/promises";

export async function readLocalizedReleaseNotes(
  whatsNewDir: string | undefined
): Promise<LocalizedText[] | undefined> {
  core.debug(`Executing readLocalizedReleaseNotes`);

  if (whatsNewDir != undefined && whatsNewDir.length > 0) {
    const releaseNotes = fs
      .readdirSync(whatsNewDir)
      .filter((value) =>
        /whatsnew-(?<local>([a-z]{2,3}(?:-[A-Z]{2})?|[a-z]{2}))(\.txt)?$/.test(
          value
        )
      );

    const pattern =
      /whatsnew-(?<local>([a-z]{2,3}(?:-[A-Z]{2})?|[a-z]{2}))(\.txt)?$/;

    const localizedReleaseNotes: LocalizedText[] = [];

    core.debug(`Found files: ${releaseNotes.toString()}`);

    for (const value of releaseNotes) {
      const matches = value.match(pattern);

      if (matches != null && matches.groups?.local) {
        core.debug(`Matches for ${value} = ${matches.toString()}`);
        const lang = matches.groups.local;
        const filePath = path.join(whatsNewDir, value);
        const content = (await readFile(filePath, "utf-8")).trim();

        if (content != undefined) {
          core.debug(`Found localized 'whatsnew-*-*' for Lang(${lang})`);
          localizedReleaseNotes.push({
            language: lang,
            text: content,
          });
        }
      }
    }

    return localizedReleaseNotes;
  }

  return undefined;
}
