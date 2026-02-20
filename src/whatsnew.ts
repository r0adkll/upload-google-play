import * as core from '@actions/core';
import * as fs from "fs";
import * as path from "path";
import {androidpublisher_v3} from "@googleapis/androidpublisher";
import LocalizedText = androidpublisher_v3.Schema$LocalizedText;
import { readFile } from 'fs/promises';

export async function readLocalizedReleaseNotes(whatsNewDir: string | undefined): Promise<LocalizedText[] | undefined> {
    core.debug(`Executing readLocalizedReleaseNotes`);
    if (whatsNewDir) {
        const releaseNotes = await fs.promises.readdir(whatsNewDir);
        const pattern = /^whatsnew-([a-z]{2,3}(?:-[A-Z]{2})?)(\.txt)?$/;

        const localizedReleaseNotes: LocalizedText[] = [];

        core.debug(`Scanning for whatsnew files in ${whatsNewDir}`);
        for (const value of releaseNotes) {
            const matches = value.match(pattern);
            if (matches && matches[1]) {
                core.debug(`Matches for ${value} = ${matches.toString()}`);
                const lang = matches[1];
                const filePath = path.join(whatsNewDir, value);
                const content = (await readFile(filePath, 'utf-8')).trim();

                if (content) {
                    core.debug(`Found localized 'whatsnew' for Lang(${lang}) in file ${value}`);
                    localizedReleaseNotes.push(
                        {
                            language: lang,
                            text: content
                        }
                    )
                }
            }
        }

        return localizedReleaseNotes
    }
    return undefined
}
