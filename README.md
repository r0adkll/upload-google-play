# Upload Android release to the Play Store

This action will help you upload an Android `.apk` or `.aab` (Android App Bundle) file to the Google Play Console using the Google Play Developer API v3.

## Inputs

### `serviceAccountJson`

**Required:** The service account json private key file to authorize the upload request

### `packageName`

**Required:** The package name, or Application Id, of the app you are uploading

### `releaseFile`

**Required:** The Android release file to upload (.apk or .aab) 

### `track`

**Required:** The track in which you want to assign the uploaded app.  
**Default:** `production`  
_Values:_ `alpha`, `beta`, `internal`, `production`

### `userFraction`

Portion of users who should get the staged version of the app. Accepts values between 0.0 and 1.0 (exclusive-exclusive). Omitting this value will execute a full rollout.

### `whatsNewDirectory`

The directory of localized whats new files to upload as the release notes. Using the pattern `whatsnew-<LOCALE>`   
i.e. `whatsnew-en-US`. Where `LOCALE` is using the [`BCP 47`](https://tools.ietf.org/html/bcp47) format, for example:
* `en-US` - English/America
* `de-DE` - German/Germany
* `ja-JP` - Japanese/Japan

### `mappingFile`

The mapping.txt file used to de-obfuscate your stack traces from crash reports

## Example usage

```yaml
uses: r0adkll/upload-google-play@v1
with:
  serviceAccountJson: ${{ SERVICE_ACCOUNT_JSON }}
  packageName: com.example.MyApp
  releaseFile: ${{ SIGNED_RELEASE_FILE}}
  track: beta
  userFraction: 0.33
  whatsNewDirectory: /distribution/whatsnew
  mappingFile: /app/build/outputs/mapping/release/mapping.txt
```