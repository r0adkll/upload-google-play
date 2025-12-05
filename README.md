# Upload Android release to the Play Store

This action will help you upload an Android `.apk` or `.aab` (Android App Bundle) file to the Google Play Console using the Google Play Developer API v3.

## Inputs

| Input | Description | Value | Required |
| --- | --- | --- | --- |
| releaseFiles | The Android release file(s) to upload (.apk or .aab) | Comma-separated paths. Supports glob via [fast-glob](https://github.com/mrmlnc/fast-glob) | true |
| serviceAccountJsonPlainText | The service account json in plain text, provided via a secret, etc | The contents of your `service-account.json` | true (or serviceAccountJson) |
| packageName | The package name, or Application Id, of the app you are uploading | A valid package name, e.g. `com.example.myapp`. The packageName must already exist in the play console account, so make sure you upload a manual apk or aab first through the console | true |
| tracks | The tracks in which you want to assign the uploaded app. Defaults to `production` | Comma-separated names. See [APKs and Tracks](https://developers.google.com/android-publisher/tracks#adding_and_modifying_apks) documentation for calculating your target track names | true |
| releaseName | The release name. Not required to be unique. Default is configured by Google Play Console | A user-friendly update name, e.g. `v1.0.0` | false |
| inAppUpdatePriority | In-app update priority of the release. All newly added APKs in the release will be considered at this priority. Defaults to `0` | `[0-5]`, where `5` is the highest priority | false |
| userFraction | Percentage of users who should get the staged version of the app. | `(0.0-1.0)` | false |
| status | Release status. Defaults to `completed`. | One of `completed`, `inProgress`, `halted`, `draft`. Cannot be null. | false |
| whatsNewDirectory | The directory of localized "whats new" files to upload as the release notes. The files contained in the `whatsNewDirectory` MUST use the pattern `whatsnew-<LOCALE>` where `LOCALE` is using the [`BCP 47`](https://tools.ietf.org/html/bcp47) format | A path to a valid `whatsNewDirectory` | false |
| mappingFile | The mapping.txt file used to de-obfuscate your stack traces from crash reports | A path to a valid `mapping.txt` file | false |
| debugSymbols | The native-debug-symbols.zip file or folder that contains your debug symbols | A path to a valid `native-debug-symbols.zip file` file or a folder | false |
| changesNotSentForReview | Indicates that the changes in this edit will not be reviewed until they are explicitly sent for review from the Google Play Console. Defaults to `false` | `true` or `false` | `false` |
| serviceAccountJson | The service account json private key file to authorize the upload request. Can be used instead of `serviceAccountJsonPlainText` to specify a file rather than provide a secret | A path to a valid `service-account.json` file | true (or serviceAccountJsonPlainText) |
| existingEditId | The ID of an existing edit that has not been completed. If this is supplied, the action will append information to that rather than creating an edit | A valid, unpublished Edit ID | false |
| versionCodesToRetain | Version codes to retain from previous releases. | Comma-separated version codes. | false |
| ~~releaseFile~~ | Please switch to using `releaseFiles` as this will be removed in the future | | false |
| ~~track~~ | Please switch to using `tracks` as this will be removed in the future | | false |

## Outputs

| Output | Environment Variable | Description |
| --- | --- | --- |
| internalSharingDownloadUrls | INTERNAL_SHARING_DOWNLOAD_URLS | A JSON list containing the download urls for every release file uploaded using the `internalsharing` track |
| internalSharingDownloadUrl | INTERNAL_SHARING_DOWNLOAD_URL | The download url for the last release file uploaded using the `internalsharing` track |
committedEditId | COMMITTED_EDIT_ID | The unique identifier of the committed edit. |
committedEditIdExpiryTimeSeconds | COMMITTED_EDIT_ID_EXPIRY_TIME_SECONDS | Time in seconds until the committed edit expires. |
 

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
  debugSymbols: app/intermediates/merged_native_libs/release/out/lib
```

## Configure access via service account
1. Enable the Google Play Android Developer API.
   1. Go to https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com.
   1. Click on Enable.
1. Create a new service account in Google Cloud Platform ([docs](https://developers.google.com/android-publisher/getting_started#service-account)).
   1. Navigate to https://cloud.google.com/gcp.
   1. Open `IAM & Admin` > `Service accounts` > `Create service account`.
   1. Pick a name for the new account. Do not grant the account any permissions.
   1. To use it from the GitHub Action use either:
      - Account key in GitHub secrets (simpler):
        1. Open the newly created service account, click on `keys` tab and add a new key, JSON type.
        1. When successful, a JSON file will be automatically downloaded on your machine.
        1. Store the content of this file to your GitHub secrets, e.g. `SERVICE_ACCOUNT_JSON`.
        2. Set `serviceAccountJsonPlainText: ${{ SERVICE_ACCOUNT_JSON }}` when using this action.
      - Workload identity authentication (more secure, recommended by GCP):
        1. Configure workload identity provider in the same project as the new service account ([docs](https://github.com/google-github-actions/auth)).
        1. Run a step to obtain short-lived access credentials:
           ```
           - id: auth
             uses: google-github-actions/auth@v2
             with:
               workload_identity_provider: <project>/.../workloadIdentityPools/<provider>
               service_account: <service-account>@<project>.iam.gserviceaccount.com
           ```
        1. Set `serviceAccountJson: ${{ steps.auth.outputs.credentials_file_path }}` when using this action.
1. Add the service account to Google Play Console.
   1. Open https://play.google.com/console and pick your developer account.
   1. Open Users and permissions.
   1. Click invite new user and add the email of the service account created in the previous step.
   1. Grant permissions to the app that you want the service account to deploy in `app permissions`.

## FAQ
### I get the error "Package not found"
Make sure you upload an apk or aab manually first by creating a release through the play console.

The `whatsNewDirectory` in this example supplies changelogs for English, German and Japanese

```
distribution/
└─ whatsnew/
  ├─ whatsnew-en-US
  ├─ whatsnew-de-DE
  └─ whatsnew-ja-JP
```

### I get the error "Precondition check failed"
This means some required state or store listing requirement hasn’t been met. Verify your track progression and edit state against the [Android Publisher API](https://developers.google.com/android-publisher) reference. Common causes include:

#### First‑time production push
You may have not yet promoted any AAB/APK through internal‑testing, alpha or beta before targeting `production`.  
  
Before you can target `production`, push at least one release through an earlier track. For example:

```yaml
uses: r0adkll/upload-google-play@v1
with:
  # ... other configurations ...
  track: internal
```

#### Edit conflict
If you start an edit draft, then make changes to the console (or another draft), committing the original draft will sometimes fail — always create a fresh edit after external changes.

#### Concurrent edits
Multiple clients may open edits in parallel, but once one is committed all others become stale and may trigger this error.
