"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fs_1 = require("fs");
function readLocalizedReleaseNotes(whatsNewDir) {
    return __awaiter(this, void 0, void 0, function* () {
        if (whatsNewDir != undefined && whatsNewDir.length > 0) {
            const releaseNotes = fs.readdirSync(whatsNewDir)
                .filter(value => /whatsnew-.*-.{2}\b/.test(value));
            const pattern = /whatsnew-(?<local>.*-.*)/;
            let localizedReleaseNotes = [];
            core.debug(`Found files: ${releaseNotes}`);
            releaseNotes.forEach(value => {
                const matches = value.match(pattern);
                core.debug(`Matches for ${value} = ${matches}`);
                if (matches != undefined && matches.length == 2) {
                    const lang = matches[1];
                    const filePath = path.join(whatsNewDir, value);
                    const content = fs_1.readFileSync(filePath, 'utf-8');
                    if (content != undefined) {
                        core.debug(`Found localized 'whatsnew-*-*' for Lang(${lang})`);
                        localizedReleaseNotes.push({
                            language: lang,
                            text: content
                        });
                    }
                }
            });
            return localizedReleaseNotes;
        }
        return undefined;
    });
}
exports.readLocalizedReleaseNotes = readLocalizedReleaseNotes;
