# Upload Android release to the Play Store

This action will help you upload an Android `.apk` or `.aab` (Android App Bundle) file to the Google Play Console using the Google Play Developer API v3.

## Inputs

| Input | Description | Value | Required |
| --- | --- | --- | --- |
| releaseFiles | The Android release file(s) to upload (.apk or .aab) | Comma-separated paths. Supports glob via [fast-glob](https://github.com/mrmlnc/fast-glob) | true |
| serviceAccountJsonPlainText | The service account json in plain text, provided via a secret, etc | The contents of your `service-account.json` | true (or serviceAccountJson) |
| packageName | The package name, or Application Id, of the app you are uploading | A valid package name, e.g. `com.example.myapp` | true |
| track | The track in which you want to assign the uploaded app. Defaults to `production` | One of `production`, `beta`, `alpha`, `internalsharing`, `internal`, or a custom track name (case sensitive) | true |
| releaseName | The release name. Not required to be unique. Default is configured by Google Play Console | A user-friendly update name, e.g. `v1.0.0` | false |
| inAppUpdatePriority | In-app update priority of the release. All newly added APKs in the release will be considered at this priority. Defaults to `0` | `[0-5]`, where `5` is the highest priority | false |
| userFraction | Percentage of users who should get the staged version of the app. If this is less than `1.0`, release status will be `inProgress`. Defaults to `1.0` | `(0.0-1.0]` | true |
| status | Release status. This can be set to `draft` to complete the release at some other time. Defaults to `completed` if targeting 100% rollout, else `inProgress` | One of `completed`, `inProgress`, `halted`, `draft` | false |
| whatsNewDirectory | The directory of localized "whats new" files to upload as the release notes. The files contained in the `whatsNewDirectory` MUST use the pattern `whatsnew-<LOCALE>` where `LOCALE` is using the [`BCP 47`](https://tools.ietf.org/html/bcp47) format | A path to a valid `whatsNewDirectory` | false |
| mappingFile | The mapping.txt file used to de-obfuscate your stack traces from crash reports | A path to a valid `mapping.txt` file | false |
| changesNotSentForReview | Indicates that the changes in this edit will not be reviewed until they are explicitly sent for review from the Google Play Console. Defaults to `false` | `true` or `false` | `false` |
| serviceAccountJson | The service account json private key file to authorize the upload request. Can be used instead of `serviceAccountJsonPlainText` to specify a file rather than provide a secret | A path to a valid `service-account.json` file | true (or serviceAccountJsonPlainText) |
| existingEditId | The ID of an existing edit that has not been completed. If this is supplied, the action will append information to that rather than creating an edit | A valid, unpublished Edit ID | false |
| ~~releaseFile~~ | Please switch to using `releaseFiles` as this will be removed in the future | | false |

## Outputs

| Output | Environment Variable | Description |
| --- | --- | --- |
| internalSharingDownloadUrls | INTERNAL_SHARING_DOWNLOAD_URLS | A JSON list containing the download urls for every release file uploaded using the `internalsharing` track |
| internalSharingDownloadUrl | INTERNAL_SHARING_DOWNLOAD_URL | The download url for the last release file uploaded using the `internalsharing` track |

## Example usage

The below example publishes `MyApp` to Google Play, targetting 33% (`0.33`) of users with a priority of `2`.

```yaml
uses: r0adkll/upload-google-play@v1
with:
  serviceAccountJsonPlainText: ${{ SERVICE_ACCOUNT_JSON }}
  packageName: com.example.MyApp
  releaseFiles: app/build/outputs/bundle/release/app-release.aab
  track: production
  status: inProgress
  inAppUpdatePriority: 2
  userFraction: 0.33
  whatsNewDirectory: distribution/whatsnew
  mappingFile: app/build/outputs/mapping/release/mapping.txt
```

The `whatsNewDirectory` in this example supplies changelogs for English, German and Japanese

```
distribution/
└─ whatsnew/
  ├─ whatsnew-en-US
  ├─ whatsnew-de-DE
  └─ whatsnew-ja-JP
```
