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

  if (whatsNewDir) {
    const files = await fs.promises.readdir(whatsNewDir);
    const pattern = /whatsnew-(?<local>[a-z]{2,3}(?:-[A-Z]{2})?)(\.txt)?$/;
    const localizedReleaseNotes: LocalizedText[] = [];

    core.debug(`Scanning for whatsnew files in ${whatsNewDir}`);

    for (const file of files) {
      const matches = file.match(pattern);

      if (matches && matches.groups && matches.groups.local) {
        const lang = matches.groups.local;
        const filePath = path.join(whatsNewDir, file);
        const content = (await readFile(filePath, "utf-8")).trim();

        if (content) {
          core.debug(
            `Found localized 'whatsnew' for Lang(${lang}) in file ${file}`
          );
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
