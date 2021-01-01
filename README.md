# Upload Android release to the Play Store

This action will help you upload an Android `.apk` or `.aab` (Android App Bundle) file to the Google Play Console using the Google Play Developer API v3.

## Inputs

_You must provide one of either `serviceAccountJson` or `serviceAccountJsonPlainText`_

### `serviceAccountJson`

The service account json private key file to authorize the upload request

### `serviceAccountJsonPlainText`

The service account json in plain text, provided via a secret, etc.

### `packageName`

**Required:** The package name, or Application Id, of the app you are uploading

### `releaseFile`
**DEPRECATED:** Please switch to using `releaseFiles` as this will be removed in the future  
The Android release file to upload (.apk or .aab) 

### `releaseFiles`
**CAVEAT:** Either this or `releaseFile` are required  

The Android release file(s) to upload (.apk or .aab). Multiple files are separated by ','.

### `releaseName`

The release name. Not required to be unique. If not set, the name is generated from the APK's versionName. If the release contains multiple APKs, the name is generated from the date.

### `track`

**Required:** The track in which you want to assign the uploaded app.  
**Default:** `production`   
_Values:_ `alpha`, `beta`, `internal`, `production`, `internalsharing`

### `inAppUpdatePriority`

In-app update priority of the release. All newly added APKs in the release will be considered at this priority. Can take values in the range [0, 5], with 5 the highest priority.

**Default:** `0`  
_Values:_ `[0, 5]`

### `userFraction`

Portion of users who should get the staged version of the app. Accepts values between 0.0 and 1.0 (exclusive-exclusive). Omitting this value will execute a full rollout.

### `whatsNewDirectory`

The directory of localized whats new files to upload as the release notes. The files contained in the `whatsNewDirectory` MUST use the pattern `whatsnew-<LOCALE>` where `LOCALE` is using the [`BCP 47`](https://tools.ietf.org/html/bcp47) format, e.g.
* `en-US` - English/America
* `de-DE` - German/Germany
* `ja-JP` - Japanese/Japan  

and contain plain `utf8` encoded text with no extension on the file. The resulting directory in your project should look something like this:
```
projectDir/
└── whatsNewDirectory/
    ├── whatsnew-en-US
    ├── whatsnew-de-DE
    └── whatsnew-ja-JP
```
where `whatsNewDirectory` is the path you pass to the action.


### `mappingFile`

The mapping.txt file used to de-obfuscate your stack traces from crash reports

## Outputs

### `internalSharingDownloadUrls`

A JSON list containing the download urls for every release file uploaded using the `track` `internalsharing`

### ENV VAR: `INTERNAL_SHARING_DOWNLOAD_URLS`

The environment variable that is set when using the `track` `internalsharing`

### `internalSharingDownloadUrl`

The download url for the last release file uploaded using the `track` `internalsharing`, useful when a single release file is uploaded

### ENV VAR: `INTERNAL_SHARING_DOWNLOAD_URL`

The environment variable that is set when using the `track` `internalsharing`

## Example usage

```yaml
uses: r0adkll/upload-google-play@v1
with:
  serviceAccountJson: ${{ SERVICE_ACCOUNT_JSON }}
  packageName: com.example.MyApp
  releaseFile: ${{ SIGNED_RELEASE_FILE}}
  track: production
  inAppUpdatePriority: 2
  userFraction: 0.33
  whatsNewDirectory: distribution/whatsnew
  mappingFile: app/build/outputs/mapping/release/mapping.txt
```
