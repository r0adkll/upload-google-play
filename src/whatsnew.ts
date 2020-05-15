import * as core from '@actions/core';
import * as fs from "fs";
import * as path from "path";
import {readFileSync} from "fs";
import {androidpublisher_v3} from "googleapis";
import LocalizedText = androidpublisher_v3.Schema$LocalizedText;

export async function readLocalizedReleaseNotes(whatsNewDir: string | undefined): Promise<LocalizedText[] | undefined> {
    if (whatsNewDir != undefined && whatsNewDir.length > 0) {
        const releaseNotes = fs.readdirSync(whatsNewDir)
            .filter(value => /whatsnew-.*-.{2,3}\b/.test(value));
        const pattern = /whatsnew-(?<local>.*-.*)/;

        let localizedReleaseNotes: LocalizedText[] = [];

        core.debug(`Found files: ${releaseNotes}`);
        releaseNotes.forEach(value => {
            const matches = value.match(pattern);
            core.debug(`Matches for ${value} = ${matches}`);
            if (matches != undefined && matches.length == 2) {
                const lang = matches[1];
                const filePath = path.join(whatsNewDir, value);
                const content = readFileSync(filePath, 'utf-8');

                if (content != undefined) {
                    core.debug(`Found localized 'whatsnew-*-*' for Lang(${lang})`);
                    localizedReleaseNotes.push(
                        {
                            language: lang,
                            text: content
                        }
                    )
                }
            }
        });

        return localizedReleaseNotes
    }
    return undefined
}
