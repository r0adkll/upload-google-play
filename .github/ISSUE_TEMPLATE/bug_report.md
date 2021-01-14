---
name: Bug report
about: Create a report to help us improve
title: ''
labels: bug
assignees: r0adkll

---

**Describe the bug**
A clear and concise description of what the bug is.

**Workflow Step Configuration**

<!-- Update the example below with your configuration to better help me debug your issue. You can obfuscate anything that isn't public. -->

```yml
- name: Deploy Production
  uses: r0adkll/upload-google-play@v1
  with:
    serviceAccountJsonPlainText: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
    packageName: com.example.app
    releaseFile: app/build/outputs/bundle/release/app-release.aab
    track: production
    whatsNewDirectory: distribution/whatsnew/
    mappingFile: app/build/outputs/mapping/release/mapping.txt
```

**Step Debugging**

- [ ] I have enabled [Step Debug Logging](https://docs.github.com/en/free-pro-team@latest/actions/managing-workflow-runs/enabling-debug-logging#enabling-step-debug-logging)

<!-- Please post your debug step logs for this step here to better help debugging, or link to your actions if your project is open source -->
