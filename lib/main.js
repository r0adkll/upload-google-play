"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
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
const edits_1 = require("./edits");
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/androidpublisher']
});
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const serviceAccountJson = core.getInput('serviceAccountJson', { required: true });
            const packageName = core.getInput('packageName', { required: true });
            const releaseFile = core.getInput('releaseFile', { required: true });
            const track = core.getInput('track', { required: true });
            const userFraction = core.getInput('userFraction', { required: false });
            const whatsNewDir = core.getInput('whatsNewDirectory', { required: false });
            const mappingFile = core.getInput('mappingFile', { required: false });
            // verify inputs
            let userFractionFloat = parseFloat(userFraction);
            if (!isNaN(userFractionFloat)) {
                if (userFractionFloat <= 0.0 || userFractionFloat >= 1.0) {
                    core.setFailed('A provided userFraction must be between 0.0 and 1.0, exclusive-exclusive');
                    return;
                }
            }
            else {
                userFractionFloat = undefined;
            }
            // Check release file
            if (!fs.existsSync(releaseFile)) {
                core.setFailed(`Unable to find release file @ ${releaseFile}`);
                return;
            }
            if (whatsNewDir != undefined && !fs.existsSync(whatsNewDir)) {
                core.setFailed(`Unable to find 'whatsnew' directory @ ${whatsNewDir}`);
                return;
            }
            if (mappingFile != undefined && !fs.existsSync(mappingFile)) {
                core.setFailed(`Unable to find 'mappingFile' @ ${mappingFile}`);
                return;
            }
            // Insure that the api can find our service account credentials
            core.exportVariable("GOOGLE_APPLICATION_CREDENTIALS", serviceAccountJson);
            const authClient = yield auth.getClient();
            yield edits_1.uploadRelease({
                auth: authClient,
                applicationId: packageName,
                track: track,
                userFraction: userFractionFloat,
                whatsNewDir: whatsNewDir,
                mappingFile: mappingFile
            }, releaseFile);
            core.debug('Finished App Release!');
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
