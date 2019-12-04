import * as core from '@actions/core';
import {uploadRelease} from "./edits";
const {google} = require('googleapis');

const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/androidpublisher']
});

async function run() {
    try {
        const serviceAccountJson = core.getInput('serviceAccountJson', { required: true });
        const packageName = core.getInput('packageName', { required: true });
        const releaseFile = core.getInput('releaseFile', { required: true });
        const track = core.getInput('track', { required: true });
        const userFraction = core.getInput('userFraction', { required: false });
        const whatsNewDir = core.getInput('whatsNewDirectory', { required: false });
        const mappingFile = core.getInput('mappingFile', { required: false });

        // verify inputs
        let userFractionFloat: number | undefined = parseFloat(userFraction);
        if (!isNaN(userFractionFloat)) {
            if (userFractionFloat <= 0.0 || userFractionFloat >= 1.0) {
                core.setFailed('A provided userFraction must be between 0.0 and 1.0, exclusive-exclusive');
                return
            }
        } else {
            userFractionFloat = undefined
        }

        // Insure that the api can find our service account credentials
        core.exportVariable("GOOGLE_APPLICATION_CREDENTIALS", serviceAccountJson);

        const authClient = await auth.getClient();

        await uploadRelease({
            auth: authClient,
            applicationId: packageName,
            track: track,
            userFraction: userFractionFloat,
            whatsNewDir: whatsNewDir,
            mappingFile: mappingFile
        }, releaseFile);

        core.debug('Finished App Release!')
    } catch (error) {
        core.setFailed(error.message)
    }
}

run();
